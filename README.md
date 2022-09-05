# KPI Schedule Bot

The most popular way to check the schedule in KPI

node.js + mongo DB

database needs 3 Collections:
- admin
- all
- dbtelegram

create autent.js with bot token, admin id, database url and admin commands.

	index.js - everything
  
 	Procfile - required by server
	autent(example).js - example for autent.js
	
	package.json - dependencies
	package-lock.json - dependencies

	список команд.txt - list for @BotFather

## Available commands

- /rozklad — helps to select or change the name of the group
- /r — same as /rozklad
	-  /today — schedule for today
	-  /tomorrow — schedule for tomorrow
	-  /week — schedule for week
	-  /nextweek — schedule for next week
	-  /timetable — lessons timetable
- /exam — your exams
- /full — schedule for two weeks with the names of teachers

- /who — reminds teacher's name
- /left — shows the time until the end of the pair

- /notification — with the help of notifications, you can receive the schedule for the next day at the time you choose
	-  /off — disables notifications
	-  /t — used to set reminder time

## Authors

- [Viacheslav Tsurkan](https://t.me/viacheslav_tsurkan)
