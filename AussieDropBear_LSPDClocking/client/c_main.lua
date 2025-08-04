local isClockedIn = false

local function IsLSPDCharacter()
    local playerData = exports['qbx_core']:GetPlayerData()
    return playerData and playerData.job and playerData.job.name == "police"
end

local function CheckAndHandleClock()
    if IsLSPDCharacter() and not isClockedIn then
        TriggerServerEvent("lspd:clockIn")
        isClockedIn = true
        lib.notify({ title = "LSPD Administration", description = "Auto clocked IN", type = "success" })
    elseif not IsLSPDCharacter() and isClockedIn then
        TriggerServerEvent("lspd:clockOut")
        isClockedIn = false
        lib.notify({ title = "LSPD Administration", description = "Auto clocked OUT", type = "error" })
    end
end

CreateThread(function()
    Wait(2000)
    CheckAndHandleClock()
end)

RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    CheckAndHandleClock()
end)

RegisterNetEvent('QBCore:Client:OnJobUpdate', function()
    CheckAndHandleClock()
end)

RegisterCommand("lspdstatus", function()
    lib.notify({ title = "LSPD Administration", description = "Clocked in: " .. tostring(isClockedIn), type = "info" })
end)

RegisterCommand("lspdclockin", function()
    if not isClockedIn and IsLSPDCharacter() then
        TriggerServerEvent("lspd:clockIn")
        isClockedIn = true
        lib.notify({ title = "LSPD Administration", description = "Manually clocked IN", type = "success" })
    else
        lib.notify({ title = "LSPD Administration", description = "Already clocked in or not LSPD", type = "error" })
    end
end)

RegisterCommand("lspdclockout", function()
    if isClockedIn then
        TriggerServerEvent("lspd:clockOut")
        isClockedIn = false
        lib.notify({ title = "LSPD Administration", description = "Manually clocked OUT", type = "error" })
    else
        lib.notify({ title = "LSPD Administration", description = "Not clocked in.", type = "error" })
    end
end)
