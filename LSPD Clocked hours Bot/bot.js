const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const mysql = require('mysql2/promise');

const DISCORD_BOT_TOKEN = ''; // BOT TOKEN
const ALLOWED_ROLE_NAMES = ['LSPD Supervisor']; // ROLE NAMES FOR PPL TO USE /CHECKHOURS COMMAND 
const LOA_ROLE_NAME = 'LOA';  // LOA ROLE NAME

const LEADERBOARD_CHANNEL_ID = '';  // channel id for where the leaderboard will be posted and updated in

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: '',
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function hasAllowedRole(member) {
  return member.roles.cache.some(role => ALLOWED_ROLE_NAMES.includes(role.name));
}

function hasLoaRole(member) {
  return member.roles.cache.some(role => role.name === LOA_ROLE_NAME);
}

let leaderboardMessageId = null;

async function updateLeaderboardMessage() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT discord_id, total_duration, job_rank FROM lspd_clock ORDER BY total_duration DESC LIMIT 10'
    );

    let description;
    if (!rows.length) {
      description = '🔍 No clock data found for the leaderboard.';
    } else {
      const guild = client.guilds.cache.first();
      if (!guild) {
        description = rows.map((row, i) => {
          const timeStr = formatTime(row.total_duration || 0);
          const rank = row.job_rank || 'Unknown';
          return `**${i + 1}.** <@${row.discord_id}> - ${timeStr} (${rank}) - LOA Status: Unknown`;
        }).join('\n');
      } else {
        const members = await Promise.all(
          rows.map(row => guild.members.fetch(row.discord_id).catch(() => null))
        );

        description = rows.map((row, i) => {
          const timeStr = formatTime(row.total_duration || 0);
          const rank = row.job_rank || 'Unknown';
          const member = members[i];
          const loaStatus = member && hasLoaRole(member) ? 'Exempt ✅' : 'Not Exempt ❌';
          return `**${i + 1}.** <@${row.discord_id}> - ${timeStr} (${rank}) - LOA Status: **${loaStatus}**`;
        }).join('\n');
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🏆 Top 10 LSPD Clocked Hours Leaderboard')
      .setColor(0xf1c40f)
      .setDescription(description)
      .setFooter({ text: `Last updated: ${new Date().toLocaleString()}` })
      .setTimestamp();

    const channel = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      console.error(`Leaderboard channel not found or is not a text channel.`);
      return;
    }

    if (leaderboardMessageId) {
      try {
        const message = await channel.messages.fetch(leaderboardMessageId);
        await message.edit({ embeds: [embed] });
      } catch (err) {
        console.warn('Leaderboard message not found, sending a new one.');
        const message = await channel.send({ embeds: [embed] });
        leaderboardMessageId = message.id;
      }
    } else {
      const message = await channel.send({ embeds: [embed] });
      leaderboardMessageId = message.id;
    }

    console.log('✅ Leaderboard message updated');

  } catch (err) {
    console.error('❌ MySQL Error during leaderboard update:', err);
  } finally {
    if (connection) await connection.end();
  }
}

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const data = [
    {
      name: 'checkhours',
      description: 'Check total clocked hours of an LSPD member',
      options: [
        {
          name: 'discordid',
          type: 3, 
          description: 'Discord ID of the player to check',
          required: true,
        },
      ],
    },
    {
      name: 'selfcheck',
      description: 'Check your own total clocked hours',
    },
    {
      name: 'leaderboard',
      description: 'Show top 10 LSPD members with highest clocked hours',
    },
    {
      name: 'forceupdate',
      description: 'Force update the leaderboard message',
    }
  ];

  const guilds = client.guilds.cache.map(g => g.id);
  for (const guildId of guilds) {
    const guild = await client.guilds.fetch(guildId);
    await guild.commands.set(data);
  }

  await updateLeaderboardMessage();
  setInterval(updateLeaderboardMessage, 30 * 60 * 1000);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options, member } = interaction;

  if (commandName === 'checkhours') {
    if (!member) {
      return interaction.reply({ content: '❌ Could not fetch your member data.' });
    }

    const permissionDeniedEmbed = new EmbedBuilder()
      .setTitle('🚫 Access Denied')
      .setDescription(
        `You must have one of the following roles to use this command:\n` +
        ALLOWED_ROLE_NAMES.map(r => `• **${r}**`).join('\n') +
        `\n\nYou can check your own hours using \`/selfcheck\`.`
      )
      .setColor(0xff0000)
      .setTimestamp();

    if (!hasAllowedRole(member)) {
      return interaction.reply({ embeds: [permissionDeniedEmbed] });
    }

    const discordID = options.getString('discordid');

    let connection;
    try {
      connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute(
        'SELECT total_duration, job_rank FROM lspd_clock WHERE discord_id = ?',
        [discordID]
      );

      if (!rows.length) {
        return interaction.reply({ content: `🔍 No clock data found for Discord ID \`${discordID}\`.` });
      }

      const totalSeconds = rows[0].total_duration || 0;
      const jobRank = rows[0].job_rank || "Unknown";
      const formattedTime = formatTime(totalSeconds);

      const loaStatusCheckHours = member && hasLoaRole(member) ? 'Exempt ✅' : 'Not Exempt ❌';

      const embed = new EmbedBuilder()
        .setTitle('🕒 LSPD Clocked Hours Report')
        .setColor(0x3498db)
        .addFields(
          { name: '👤 Discord', value: `<@${discordID}>`, inline: true },
          { name: '🧢 Job Rank', value: jobRank, inline: true },
          { name: '⏱️ Total Time', value: formattedTime, inline: true },
          { name: '🛡️ LOA Status', value: loaStatusCheckHours, inline: true }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error('❌ MySQL Error:', err);
      return interaction.reply({ content: '⚠️ A database error occurred while checking hours.' });
    } finally {
      if (connection) await connection.end();
    }
  }

  if (commandName === 'selfcheck') {
    if (!member) {
      return interaction.reply({ content: '❌ Could not fetch your member data.' });
    }

    const discordID = interaction.user.id;

    let connection;
    try {
      connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute(
        'SELECT total_duration, job_rank FROM lspd_clock WHERE discord_id = ?',
        [discordID]
      );

      if (!rows.length) {
        return interaction.reply({ content: `🔍 No clock data found for you.` });
      }

      const totalSeconds = rows[0].total_duration || 0;
      const jobRank = rows[0].job_rank || "Unknown";
      const formattedTime = formatTime(totalSeconds);

      const loaStatusSelfCheck = member && hasLoaRole(member) ? 'Exempt ✅' : 'Not Exempt ❌';

      const embed = new EmbedBuilder()
        .setTitle('🕒 Your LSPD Clocked Hours')
        .setColor(0x2ecc71)
        .addFields(
          { name: '🧢 Job Rank', value: jobRank, inline: true },
          { name: '⏱️ Total Time', value: formattedTime, inline: true },
          { name: '🛡️ LOA Status', value: loaStatusSelfCheck, inline: true }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error('❌ MySQL Error:', err);
      return interaction.reply({ content: '⚠️ A database error occurred while checking your hours.' });
    } finally {
      if (connection) await connection.end();
    }
  }

  if (commandName === 'leaderboard') {
    if (!member) {
      return interaction.reply({ content: '❌ Could not fetch your member data.' });
    }

    const permissionDeniedEmbed = new EmbedBuilder()
      .setTitle('🚫 Access Denied')
      .setDescription(
        `You must have one of the following roles to use this command:\n` +
        ALLOWED_ROLE_NAMES.map(r => `• **${r}**`).join('\n')
      )
      .setColor(0xff0000)
      .setTimestamp();

    if (!hasAllowedRole(member)) {
      return interaction.reply({ embeds: [permissionDeniedEmbed] });
    }

    const channel = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);
    let leaderboardEmbed;

    try {
      if (leaderboardMessageId) {
        const message = await channel.messages.fetch(leaderboardMessageId);
        leaderboardEmbed = message.embeds[0];
      }
    } catch {
      leaderboardEmbed = new EmbedBuilder()
        .setTitle('🏆 Top 10 LSPD Clocked Hours Leaderboard')
        .setColor(0xf1c40f)
        .setDescription('Leaderboard not available at the moment. Try again later.')
        .setTimestamp();
    }

    return interaction.reply({ embeds: [leaderboardEmbed] || [] });
  }

  if (commandName === 'forceupdate') {
    if (!member) {
      return interaction.reply({ content: '❌ Could not fetch your member data.' });
    }

    const permissionDeniedEmbed = new EmbedBuilder()
      .setTitle('🚫 Access Denied')
      .setDescription(
        `You must have one of the following roles to use this command:\n` +
        ALLOWED_ROLE_NAMES.map(r => `• **${r}**`).join('\n')
      )
      .setColor(0xff0000)
      .setTimestamp();

    if (!hasAllowedRole(member)) {
      return interaction.reply({ embeds: [permissionDeniedEmbed] });
    }

    await interaction.deferReply();

    await updateLeaderboardMessage();

    const embed = new EmbedBuilder()
      .setTitle('✅ Leaderboard Updated')
      .setDescription('The leaderboard message has been successfully updated.')
      .setColor(0x2ecc71)
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
});

client.login(DISCORD_BOT_TOKEN);
