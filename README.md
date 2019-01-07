# @KPI_schedule_bot - the most popular way to check the schedule in KPI

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



Доступные команды:

- /rozklad — помогает выбрать или поменять название группы
- /r — тоже, что /rozklad
-  /today — расписание на сегодня
-  /tomorrow — расписание на завтра
-  /week — расписание на неделю
-  /nextweek — расписание на следующую неделю
-  /timetable — расписание звонков
- /exam — твои экзамены
- /full — расписание на две недели с именами преподавателей

- /who — подсказывает имя преподавателя
- /left — показывает время до конца пары

- /notification — c помощью уведомлений ты можешь получать в выбранное тобой время расписание на следующий день
-  /off — выключает уведомления
-  /t — используется для установки времени напоминания


author: @ViacheslavTsurkan
