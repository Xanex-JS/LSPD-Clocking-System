--[[
    Author: AussieDropBear
    Desc: LSPD Clocking system supports discord
--]]

fx_version 'cerulean'
game 'gta5'

description 'LSPD Clocking system supports discord by aussiedropbear'
author 'AussieDropBear'
version '1.0.0'

client_script {
    'client/c_main.lua',
}

shared_script {
    '@ox_lib/init.lua'
}

server_script {
    'server/s_main.lua'
}

lua54 'yes'