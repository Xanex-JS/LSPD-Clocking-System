local discordWebhook = "" -- webhook to post the clock in/out threads to
local activeClocks = {}

local function formatTime(seconds)
    local h = math.floor(seconds / 3600)
    local m = math.floor((seconds % 3600) / 60)
    local s = seconds % 60
    return string.format("%02d:%02d:%02d", h, m, s)
end

local function getDiscordID(playerSrc)
    for _, id in pairs(GetPlayerIdentifiers(playerSrc)) do
        if string.find(id, "discord:") then
            return id:gsub("discord:", "")
        end
    end
    return "N/A"
end

local function SaveClockIn(citizenid, discordID, timestamp, jobRank)
    exports.oxmysql:execute([[
        INSERT INTO lspd_clock (citizenid, discord_id, last_clock_in, job_rank)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            discord_id = VALUES(discord_id),
            last_clock_in = VALUES(last_clock_in),
            job_rank = VALUES(job_rank)
    ]], {citizenid, discordID, os.date("%Y-%m-%d %H:%M:%S", timestamp), jobRank})
end

local function SaveClockOut(citizenid, timestamp, duration)
    exports.oxmysql:execute([[
        UPDATE lspd_clock
        SET
            last_clock_out = ?,
            total_duration = total_duration + ?
        WHERE citizenid = ?
    ]], {os.date("%Y-%m-%d %H:%M:%S", timestamp), duration, citizenid})
end

RegisterNetEvent("lspd:clockIn", function()
    local src = source
    local player = exports['qbx_core']:GetPlayer(src)
    if not player or activeClocks[src] then return end

    local citizenid = player.PlayerData.citizenid
    local now = os.time()
    local discordID = getDiscordID(src)
    local jobRank = player.PlayerData.job?.grade?.name or "unknown"

    activeClocks[src] = now
    SaveClockIn(citizenid, discordID, now, jobRank)

    local name = ("%s %s"):format(player.PlayerData.charinfo.firstname, player.PlayerData.charinfo.lastname)

    local embed = {{
        title = "🚔 LSPD Clock In",
        color = 65280,
        fields = {
            {name = "Name", value = name, inline = true},
            {name = "Discord", value = discordID, inline = true},
            {name = "Rank", value = jobRank, inline = true},
        },
        footer = {text = os.date("%Y-%m-%d %H:%M:%S")},
        timestamp = os.date("!%Y-%m-%dT%H:%M:%SZ"),
    }}

    PerformHttpRequest(discordWebhook, function() end, "POST", json.encode({username = "LSPD Logger", embeds = embed}), {["Content-Type"] = "application/json"})
end)

RegisterNetEvent("lspd:clockOut", function()
    local src = source
    local player = exports['qbx_core']:GetPlayer(src)
    if not player then return end

    local clockIn = activeClocks[src]
    if not clockIn then return end

    local now = os.time()
    local duration = now - clockIn
    local citizenid = player.PlayerData.citizenid
    local discordID = getDiscordID(src)
    local name = ("%s %s"):format(player.PlayerData.charinfo.firstname, player.PlayerData.charinfo.lastname)
    local timeWorked = formatTime(duration)

    SaveClockOut(citizenid, now, duration)
    activeClocks[src] = nil

    local embed = {{
        title = "🚓 LSPD Clock Out",
        color = 16711680,
        fields = {
            {name = "Name", value = name, inline = true},
            {name = "Time Worked", value = timeWorked, inline = true},
            {name = "Discord", value = discordID, inline = true},
        },
        footer = {text = os.date("%Y-%m-%d %H:%M:%S")},
        timestamp = os.date("!%Y-%m-%dT%H:%M:%SZ"),
    }}

    PerformHttpRequest(discordWebhook, function() end, "POST", json.encode({username = "LSPD Logger", embeds = embed}), {["Content-Type"] = "application/json"})
end)

AddEventHandler("playerDropped", function()
    local src = source
    local player = exports['qbx_core']:GetPlayer(src)
    if not player or not activeClocks[src] then return end

    local clockIn = activeClocks[src]
    local now = os.time()
    local duration = now - clockIn
    local citizenid = player.PlayerData.citizenid
    local discordID = getDiscordID(src)
    local name = ("%s %s"):format(player.PlayerData.charinfo.firstname, player.PlayerData.charinfo.lastname)

    SaveClockOut(citizenid, now, duration)
    activeClocks[src] = nil

    local embed = {{
        title = "🚓 LSPD Clock Out (Disconnected)",
        color = 16711680,
        fields = {
            {name = "Name", value = name, inline = true},
            {name = "Info", value = "Player disconnected while on duty", inline = false},
            {name = "Discord", value = discordID, inline = true},
        },
        footer = {text = os.date("%Y-%m-%d %H:%M:%S")},
        timestamp = os.date("!%Y-%m-%dT%H:%M:%SZ"),
    }}

    PerformHttpRequest(discordWebhook, function() end, "POST", json.encode({username = "LSPD Logger", embeds = embed}), {["Content-Type"] = "application/json"})
end)
