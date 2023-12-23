<header><h1>{Bot Info}</h1></header>

- [What are you?](#whoami)
- [Stats](#stats)
- [Monsters](#monsters)
- [Commands](#commands)

# What are you?<a id="whoami"></a>

Hi! I am at your service, I deliver pics to your clan.
I am easy to get started. Just send me a monster name which is in my fax network, and I will deliver that monster to your clan's fax machine.
Be aware though that you need a VIP invitation to access the fax machine, and I will need a whitelist to your clan.
If you wish to add a monster to the fax network, give me a clan title with "Source" or "Fax Source" in the name.

---

# Give me some interesting (cached) stats!<a id="stats"></a>
|Name|Count|
|---|---|
|Source Clans|{Source Clans}|
|Other Clans|{Other Clans}|
|Faxes Served|{Faxes Served}|

### Here's the most requested monsters!

|Monster|Requested|
|---|---|
{Top Requests}

---

# Faxable Monsters<a id="monsters"></a>

|ID|Name|Command|
|-|-|-|
{Monster List}

---

# Commands<a id="commands"></a>

#### Give me a fax!
Just send the monster name or ID to request a fax.

#### Your clan title has changed, please check it out
Send me `refresh` while in the clan.

#### No no, I want you to check every clan you have access to
Well, this is restricted to a few people which probably doesn't include you.. But send me `refresh all`!

#### Help!
You're already reading the help, but you do you. Send me `help`!

#### I hear you're looking for monsters?
Sure! This isn't likely to always be the case, but I have fax clans that are already set up and just need monsters to be added.

This is done by giving it the clan title `Fax Source: M1234` where `1234` is the monster ID. If the fax machine doesn't match the clan title, I will add it to my "looking for" list.

Anyone can do this, you just need to use a portable photocopier on a monster then place the photocopy into your clan's fax machine, then tell me `addfax run`!

* `addfax which` - Requests a list of monsters that I'm looking for.
* `addfax run` - You have a fax I'm looking for? I'll come and check out your clan's fax machine to grab it!
* `addfax <Monster Name>` - Want to know if I'm looking for a certain monster that you may be fighting? Or have plans to fight? Just send me `addfax ` then the monster name! So `addfax Knob Goblin Embezzler` will probably tell you `Sorry, I don't need that monster!`.