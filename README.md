This is a faxbot written in typescript for Kingdom of Loathing

## The following is outdated and was intended for an older bot design

The `Settings.json` is the only thing you should need to configure in this script itself.
`username`: The bot name
`password`: The bot password
`botOperator`: The player that runs this bot, used to inform people who to contact when the bot goes wrong
`defaultClan`: What clan this bot will normally hang out in. Must be clan ID, not name
`faxDumpClan`: What clan this bot will dump unwanted faxes in, the clan should not be in use and must have a fax machine. Must be clan ID, not name
`runFaxRollover`: Read below
`runFaxRolloverBurnTurns`: Read below
`maintainLeadership`: A map of string keys and values which map to account names and passwords. The bot will log into those accounts daily to keep them active, preventing clan leadership problems.
`allowedRefreshers`: A string array of user IDs, if a user in this list PM's the bot "refresh", the bot will visit every clan it knows to update the clan information. Being faxbot title, and fax information.

## Run Fax Rollover

This helps the bot identify monsters by their monster ID, especially when the monster is confusing because kol doesn't tell us which variation of the monster we are looking at.

What it does is that when we approach rollover, the bot will grab a fax of a monster it wants to test, join the default clan, then start the fight against said monster using a fax.

Then, because we're using [`Abyssal Sweat`](https://kol.coldfront.net/thekolwiki/index.php/Abyssal_Sweat) (You will need to have that effect active, just needs a single application), the bot will not take any damage and it will survive the first round.
Rollover occurs, and the bot is automatically given a free boot out of the fight that prevents it from adding a turn to our faxbot.

However, `runFaxRolloverBurnTurns` lets you run the rollover fights even if you do not have the effect active. The cavet is that the bot will also automatically rest to restore HP if it has no health remaining.
Because you can only do one fax a day, this will still run only on rollover. So you'll be forced into a free fight if you happen to survive the first round.
That said, you probably won't survive the first round against some monsters.
