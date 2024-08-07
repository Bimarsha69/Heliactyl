/**
 *      __         ___            __        __
 *     / /_  ___  / (_)___ ______/ /___  __/ /
 *    / __ \/ _ \/ / / __ `/ ___/ __/ / / / / 
 *   / / / /  __/ / / /_/ / /__/ /_/ /_/ / /  
 *  /_/ /_/\___/_/_/\__,_/\___/\__/\__, /_/   
 *                               /____/      
 * 
 *     Heliactyl 18.0.0 (Ironclad Ridge)
 * 
 */

const loadConfig = require("../handlers/config");
const settings = loadConfig("./config.toml");
const indexjs = require("../app.js");
const ejs = require("ejs");
const chalk = require("chalk");
const fs = require("fs");

/* Ensure platform release target is met */
const heliactylModule = { "name": "AFK Page", "api_level": 3, "target_platform": "18.0.0" };

if (heliactylModule.target_platform !== settings.version) {
  console.log('Module ' + heliactylModule.name + ' does not support this platform release of Heliactyl. The module was built for platform ' + heliactylModule.target_platform + ' but is attempting to run on version ' + settings.version + '.')
  process.exit()
}

/* Module */
module.exports.heliactylModule = heliactylModule;
module.exports.load = async function(app, db) {
  app.ws("/" + settings.api.afk.path, async (ws, req) => {
    let currentlyonpage = await db.get('afkSessions');
    let newsettings = loadConfig("./config.toml");
    if (!req.session.pterodactyl) return ws.close();
    if (currentlyonpage[req.session.userinfo.id]) return ws.close();

    currentlyonpage[req.session.userinfo.id] = true;
    await db.set('afkSessions', currentlyonpage)

    // Retrieve the user package type from the database
    let coinRate = newsettings.api.afk.coins;

    let coinloop = setInterval(
      async function() {
        let usercoins = await db.get("coins-" + req.session.userinfo.id);
        usercoins = usercoins ? usercoins : 0;
        // Adjust the increment based on the user package
        usercoins = usercoins + (coinRate * (newsettings.api.afk.every / 60));
        await db.set("coins-" + req.session.userinfo.id, usercoins);
      }, newsettings.api.afk.every * 1000
    );

    ws.onclose = async() => {
      clearInterval(coinloop);
      let newonpage = await db.get('afkSessions');
      delete newonpage[req.session.userinfo.id];
      await db.set('afkSessions', newonpage)
    }
  });
};