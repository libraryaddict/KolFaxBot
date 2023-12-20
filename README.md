This is a faxbot written in typescript for Kingdom of Loathing.

# Setup

You will need to copy `.example.env` to `.env` to begin. This file shouldn't be shared for obvious reasons, being a configuration file.
The clans mentioned in the config use clan IDs.

The fax monster list is served via http on port 3000, to change this you will need to modify the code itself as it was done for the loathers site.
The FaxBot itself must have a clan VIP invitation, and have chat access.

## Run Fax Rollover

Rollover faxes has not been tested, and is not being used at this time. The documention here remains for future revisement.

This helps the bot identify monsters by their monster ID, especially when the monster is confusing because kol doesn't tell us which variation of the monster we are looking at.

What it does is that when we approach rollover, the bot will grab a fax of a monster it wants to test, join the default clan, then start the fight against said monster using a fax.

Then, because we're using [`Abyssal Sweat`](https://kol.coldfront.net/thekolwiki/index.php/Abyssal_Sweat) (You will need to have that effect active, just needs a single application), the bot will not take any damage and it will survive the first round.
Rollover occurs, and the bot is automatically given a free boot out of the fight that prevents it from adding a turn to our faxbot.

However, `runFaxRolloverBurnTurns` lets you run the rollover fights even if you do not have the effect active. The cavet is that the bot will also automatically rest to restore HP if it has no health remaining.
Because you can only do one fax a day, this will still run only on rollover. So you'll be forced into a free fight if you happen to survive the first round.
That said, you probably won't survive the first round against some monsters.
