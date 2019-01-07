var express = require('express');
var app     = express();
var request = require("request")
var moment = require('moment-timezone');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
const Telegraf = require('telegraf')


var secure = require('./autent.js');
var url = secure.mongo_url
process.env.BOT_TOKEN = secure.BOT_TOKEN 


var errortext = "Чтобы выбрать или поменять группу, напиши \n/r и название группы.\nнапример \"/r ka81\"";


//server init
app.set('port', (process.env.PORT ));
//For avoidong Heroku $PORT error
app.get('/', function(request, response) {
	var result = 'App is running'
	response.send(result);
}).listen(app.get('port'), function() {
	console.log('App is running, server is listening on port ', app.get('port'));
});

// init bot
const bot = new Telegraf(process.env.BOT_TOKEN)

bot.telegram.getMe().then((botInfo) => {
	bot.options.username = botInfo.username
})

var extra = new function() {
	this.parse_mode = "Markdown";
};	

bot.telegram.sendMessage(secure.admin_id,"Server start").catch((err) => console.log(err));
bot.startPolling()


//

bot.command('chatid', ({ chat}) => {
	bot.telegram.sendMessage(chat.id, chat.id).catch((err) => console.log(err));
})

bot.command('start', ({ chat, message}) => {
	
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);
		db.collection('all').find({'chatid':message.chat.id}).count()
		.then(Promise => {
			
			if (!(Promise)){

				var name = message.chat.title?message.chat.title:(message.chat.username+message.chat.first_name+message.chat.last_name);
				db.collection('all').insert({'name': name, 'chatid': message.chat.id, 'year': 0, 'stat': 0}, function(err, result) {		
					db.close;
				})
			} 
		});
	});
	
	bot.telegram.sendMessage(chat.id, 'Привет! Это бот для быстрого и удобного просмотра расписания. Чтобы выбрать или поменять группу, напиши /r и название группы, \nнапример \"/r ka61\"').catch((err) => console.log(err));
})

bot.command('help', ({ chat }) => {
	var texts = 'Доступные команды:\n/rozklad — помогает выбрать или поменять название группы\n/r — тоже, что /rozklad\n /today — расписание на сегодня\n /tomorrow — расписание на завтра\n /week — расписание на неделю\n /nextweek — расписание на следующую неделю\n /timetable — расписание звонков\n/exam — твои экзамены\n/full — расписание на две недели с именами преподавателей\n\n/who — подсказывает имя преподавателя\n/left — показывает время до конца пары\n\n/notification — c помощью уведомлений ты можешь получать в выбранное тобой время расписание на следующий день\n /off — выключает уведомления\n /t — используется для установки времени напоминания\n\n/help — показать это сообщение 😱';
	bot.telegram.sendMessage(chat.id, texts).catch((err) => console.log(err));
})


// rcommand -> 'OK' -> menu
bot.command('r', ({ chat, message }) => {
	rcommand(chat, message);
})

bot.command('s', ({ chat, message }) => {
	rcommand(chat, message);
})

bot.command('schedule', ({ chat, message }) => {
	rcommand(chat, message);
})


bot.command('rozklad', ({ chat, message }) => {
	rcommand(chat, message);
})	



function rcommand(chat, message){
	var groupbyid = false;
	// проверка на наличие в all
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);
		db.collection('all').find({'chatid':message.chat.id}).count()
		.then(Promise => {
			
			if (!(Promise)){

				var name = message.chat.title?message.chat.title:(message.chat.username+message.chat.first_name+message.chat.last_name);
				db.collection('all').insert({'name': name, 'chatid': message.chat.id, 'year': 0, 'stat': 0}, function(err, result) {		
					
				})
				db.close;
			} 
		});
	});
	
	var group = '';

	// проверка на команду без аргумента
	if (message.text == "/r" || message.text == "/r@KPI_schedule_bot" || message.text == "/rozklad" || message.text == "/rozklad@KPI_schedule_bot"|| message.text == "/schedule"|| message.text == "/s"){
		MongoClient.connect(url, function(err, db) {
			assert.equal(null, err);

			var collection = db.collection('dbtelegram');

			collection.find({'chatid':chat.id}).count()
			.then(Promise => {
				
				if (Promise){				
					collection.find({'chatid':chat.id}).toArray(function(err, docs) {
						menu(docs[0].group,chat);
						db.close;
					});


					return;
				} else {
					bot.telegram.sendMessage(chat.id, errortext).catch((err) => console.log(err));
					db.close;
					return;
				}
			});
		});

	} else{

		// проверка на наличие только id
		var notnumbers = /[^0-9]/;
		if (notnumbers.exec(message.text.replace("/rozklad","").replace("@KPI_schedule_bot","").replace("/r","").replace(" ",""))){


			var re = /([0-9][0-9])/;
			var er= /(-)/;
		// проверка на наличие 2 цифр
		if (re.exec(message.text)){
			// проверка и исправление "-"
			if (er.exec(message.text)){
				var str = message.text.replace("/rozklad","").replace("@KPI_schedule_bot","").replace("/r","").replace(" ","");
			} else{
				var num = re.exec(message.text)[1];
				var str = message.text.replace("/rozklad","").replace("@KPI_schedule_bot","").replace("/r","").replace(" ","").replace(re,"-"+num);
			}
			
		} else{	
			groupsearch(message.text, chat);			
			return;
		}
	}else{
		
		groupbyid = true;
		str = message.text.replace("/rozklad","").replace("@KPI_schedule_bot","").replace("/r","").replace(" ","");
		if (str == "0"){
			bot.telegram.sendMessage(chat.id, errortext).catch((err) => console.log(err));
			return;
		}
	}
	
	group = encodeURIComponent(str.toUpperCase());

	// проверка есть ли группа в базе
	request({
		url: "https://api.rozklad.org.ua/v2/groups/"+group+"/",
		json: true
	}, function (err, res, bod) {
		if (!err && res.statusCode === 200){
			group = bod.data.group_full_name;
			if (groupbyid){
				group = str;
			}
			
			MongoClient.connect(url, function(err, db) {
				assert.equal(null, err);

				var collection = db.collection('dbtelegram');	
				
				collection.find({'chatid':chat.id}).count()
				.then(Promise => {
					
					if (Promise){

						collection.updateOne(
							{ "chatid" : chat.id },
							{
								$set: { "group": group}

							}, function(err, results) {

							});

						menu(bod.data.group_full_name,chat);
						db.close;
						return;
					} else {
						var name = message.chat.title?message.chat.title:(message.chat.username+message.chat.first_name+message.chat.last_name);
						db.collection('dbtelegram').insert({'name': name, 'chatid': chat.id, 'group': group}, function(err, result) {
							
							menu(bod.data.group_full_name,chat);
							
							db.close;
							return;
						})
					}
				});

			})	


		}else{
			if (bod){
				if (bod.message == "Group not found"){
					groupsearch(message.text, chat);
				}else{
					bot.telegram.sendMessage(chat.id, bod.message).catch((err) => console.log(err));
				}
				return;
			}
			bot.telegram.sendMessage(chat.id, "server error").catch((err) => console.log(err));
			return;

		}
	})
}
}

// если введено не полное название, выводит список предложений
function groupsearch(group,chat){
	
	group = group.replace("/rozklad","").replace("@KPI_schedule_bot","").replace("/r","").replace(" ","");
	var er= /(-)/;
	if (! er.exec(group)){
		
		group = group.substring(0,2)+"-"+group.substring(2);
		
	}
	group = encodeURIComponent(group.toUpperCase());
	
	
	request({
		url: "https://api.rozklad.org.ua/v2/groups/?search={%27query%27:%27"+group+"%27}",
		json: true
	}, function (err, res, bod) {
		if (!err && res.statusCode === 200){
			answer = "*Группа не найдена, но были найдены такие группы:\n*";
			
			var arr = [];
			for(var i = 0; i<bod.data.length;i++){
				arr.push(bod.data[i].group_full_name)				
			}

			var sorted_arr = arr.slice().sort(); 
			var results = [];
			for (var i = 0; i < sorted_arr.length - 1; i++) {
				if (sorted_arr[i + 1] == sorted_arr[i]) {
					results.push(sorted_arr[i]);
				}
			}

			var h = false;
			for(var i = 0; i<bod.data.length;i++){
				

				if (results.includes(bod.data[i].group_full_name)){
					answer += ("_id "+bod.data[i].group_id + "_: "+ bod.data[i].group_full_name)+"\n";
					h = true;
					var tempp = bod.data[i].group_id;
				}else{
					answer += (bod.data[i].group_full_name)+"\n";
				}		
			}

			answer +="*напиши */r* и название группы.*"
			if (h){
				answer +="\n\n_Если название твоей группы не уникально, напиши_ /r _и id своей группы. Например, \"/r "+tempp+"\"_"
			}
			bot.telegram.sendMessage(chat.id, answer, extra).catch((err) => console.log(err));

		}else{
			bot.telegram.sendMessage(chat.id, errortext).catch((err) => console.log(err));
		}
	})
	
}

/*
command codes:
1 today
2 tomorrow
3 week
4 nextweek
5
6
7 notification tomorrow (time after 11:30)
8 notification today (time before 11:30)

commandSelector -> schedule
*/

bot.command('today', ({ chat }) => {
	commandSelector(chat, 1)
})

bot.command('tomorrow', ({ chat }) => {
	commandSelector(chat, 2)
})

bot.command('week', ({ chat }) => {
	commandSelector(chat, 3)
	
})

bot.command('nextweek', ({ chat }) => {
	commandSelector(chat, 4)
	
})

function commandSelector(chat, nn){
	statistic(chat)
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);

		var collection = db.collection('dbtelegram');

		collection.find({'chatid':chat.id}).count()
		.then(Promise => {

			if (Promise){
				collection.find({'chatid':chat.id}).toArray(function(err, docs) {
					schedule(docs[0].group, chat.id,nn);
				});  	
				db.close;
				return;
			} else {
				bot.telegram.sendMessage(chat.id, errortext, extra).catch((err) => console.log(err));
				db.close;
				return;
			}
		});
	});
}


bot.command('timetable', ({ chat }) => {
	statistic(chat);			
	var answer = "_1 пара_ 	08-30 - 10-05\n_2 пара_ 	10-25 - 12-00\n_3 пара_ 	12-20 - 13-55\n_4 пара_ 	14-15 - 15-50\n_5 пара_ 	16-10 - 17-45\n";
	bot.telegram.sendMessage(chat.id, answer, extra).catch((err) => console.log(err));
	
})

function menu(group,chat){
	request({
		url: "https://api.rozklad.org.ua/v2/weeks",
		json: true
	}, function (err, res, bod) {
		if (!err && res.statusCode === 200){

					//return + week + group

					
					var answer = "`"+group+"\n"+moment().tz("Europe/Kiev").format('DD.MM')+", week: "+bod.data+"`"+"\n/today\n/tomorrow\n/week\n/nextweek\n/timetable\n";
					bot.telegram.sendMessage(chat.id, answer, extra).catch((err) => console.log(err));
					
				}
			})
}


// increment stat in bd if a user uses the bot
function statistic(chat){
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);						
		db.collection('all').updateOne(
			{ 'chatid' : chat.id },{ $inc : { 'stat': 1 } }, function(err, results) {	
			});
		
		db.close;
	});
}

function schedule(group, chatid, commandNumber){

	var url = "https://api.rozklad.org.ua/v2/groups/"+encodeURIComponent(group)+"/timetable";
	request({
		url: url, 
		json: true
	}, function (error, response, body) {
		var answer = "";

		if (!error && response.statusCode === 200) {
			url = "https://api.rozklad.org.ua/v2/weeks"
			request({
				url: url,
				json: true
			}, function (err, res, bod) {
				
				if (!err && res.statusCode === 200){
					var week = bod.data;
					if (commandNumber == 4){
						week = (week==1)?2:1;
					}



					for (var i = 1; i < Object.keys(body.data.weeks[week].days).length+1; i++) {
						if ((commandNumber == 1 || commandNumber == 8)&& i != moment().tz("Europe/Kiev").format('e')) {
							continue;
						}
						if ((commandNumber == 2 || commandNumber == 7)&& i-1 != (moment().tz("Europe/Kiev").format('e'))) {
							continue;
						}
						
						if ((commandNumber == 2 || commandNumber == 7) && 0 == (moment().tz("Europe/Kiev").format('e'))){
							week = (week==1)?2:1;
						}
						
						if (Object.keys(body.data.weeks[week].days[i].lessons).length == 0) {
							continue;
						}
						answer +="*" +body.data.weeks[week].days[i].day_name+"*"+"\n";
						for (var j = 0; j < Object.keys(body.data.weeks[week].days[i].lessons).length; j++) {

							answer += body.data.weeks[week].days[i].lessons[j].lesson_number+") "+body.data.weeks[week].days[i].lessons[j].lesson_name
							if (body.data.weeks[week].days[i].lessons[j].lesson_type != ""){
								answer += " `"+body.data.weeks[week].days[i].lessons[j].lesson_type+"`"
							}
							if (Object.keys(body.data.weeks[week].days[i].lessons[j].rooms).length != 0){
								answer +="` " +body.data.weeks[week].days[i].lessons[j].rooms[0].room_name+"`"+"\n"
							} else{
								answer +="\n";
							}
						}

					}


					if (commandNumber == 1 &&  0 == moment().tz("Europe/Kiev").format('e')){
						week = (week==1)?2:1;
						answer += "_Сегодня пар нет_\n\n"
						var i = 1;
						answer +="*" +body.data.weeks[week].days[i].day_name+"*"+"\n";
						for (var j = 0; j < Object.keys(body.data.weeks[week].days[i].lessons).length; j++) {

							answer += body.data.weeks[week].days[i].lessons[j].lesson_number+") "+body.data.weeks[week].days[i].lessons[j].lesson_name
							if (body.data.weeks[week].days[i].lessons[j].lesson_type != ""){
								answer += " `"+body.data.weeks[week].days[i].lessons[j].lesson_type+"`"
							}
							if (Object.keys(body.data.weeks[week].days[i].lessons[j].rooms).length != 0){
								answer +=" `" +body.data.weeks[week].days[i].lessons[j].rooms[0].room_name+"`"+"\n"
							} else{
								answer +="\n";
							}
						}
					}
					
					if (commandNumber == 2 &&  6 == moment().tz("Europe/Kiev").format('e')){
						week = (week==1)?2:1;
						answer += "_Завтра пар нет_\n\n"
						var i = 1;
						answer +="*" +body.data.weeks[week].days[i].day_name+"*"+"\n";
						for (var j = 0; j < Object.keys(body.data.weeks[week].days[i].lessons).length; j++) {

							answer += body.data.weeks[week].days[i].lessons[j].lesson_number+") "+body.data.weeks[week].days[i].lessons[j].lesson_name
							if (body.data.weeks[week].days[i].lessons[j].lesson_type != ""){
								answer += " `"+body.data.weeks[week].days[i].lessons[j].lesson_type+"`"
							}
							if (Object.keys(body.data.weeks[week].days[i].lessons[j].rooms).length != 0){
								answer +=" `" +body.data.weeks[week].days[i].lessons[j].rooms[0].room_name+"`"+"\n"
							} else{
								answer +="\n";
							}
						}
					}
					if (commandNumber == 1 &&  6 == moment().tz("Europe/Kiev").format('e') && answer == ""){
						week = (week==1)?2:1;
						answer += "_Сегодня пар нет_\n\n"
						var i = 1;
						answer +="*" +body.data.weeks[week].days[i].day_name+"*"+"\n";
						for (var j = 0; j < Object.keys(body.data.weeks[week].days[i].lessons).length; j++) {

							answer += body.data.weeks[week].days[i].lessons[j].lesson_number+") "+body.data.weeks[week].days[i].lessons[j].lesson_name
							answer += " `"+body.data.weeks[week].days[i].lessons[j].lesson_type+"`"
							if (Object.keys(body.data.weeks[week].days[i].lessons[j].rooms).length != 0){
								answer +=" `" +body.data.weeks[week].days[i].lessons[j].rooms[0].room_name+"`"+"\n"
							} else{
								answer +="\n";
							}
						}
					}
					if (commandNumber == 2 &&  5 == moment().tz("Europe/Kiev").format('e') && answer == ""){
						answer += "_Завтра пар нет_\n\n"
						var i = 1;
						answer +="*" +body.data.weeks[week].days[i].day_name+"*"+"\n";
						for (var j = 0; j < Object.keys(body.data.weeks[week].days[i].lessons).length; j++) {

							answer += body.data.weeks[week].days[i].lessons[j].lesson_number+") "+body.data.weeks[week].days[i].lessons[j].lesson_name
							if (body.data.weeks[week].days[i].lessons[j].lesson_type != ""){
								answer += " `"+body.data.weeks[week].days[i].lessons[j].lesson_type+"`"
							}
							if (Object.keys(body.data.weeks[week].days[i].lessons[j].rooms).length != 0){
								answer +=" `" +body.data.weeks[week].days[i].lessons[j].rooms[0].room_name+"`"+"\n"
							} else{
								answer +="\n";
							}
						}
					}
					
					if (!(answer == "") && commandNumber == 3 && 0 == moment().tz("Europe/Kiev").format('e')){
						answer += "\n _!Расписание на следующую неделю:_  /nextweek";
					}


					if (answer == "" && (commandNumber == 1)){
						answer = "Пар в расписании на сегодня нет.";
					}
					
					if (answer == "" && (commandNumber == 2 )){
						answer = "Пар в расписании на завтра нет.";
					}

					if (answer == ""){
						if (! commandNumber == 7){
							if (! commandNumber == 8){
								bot.telegram.sendMessage(chatid, "Пар в расписании нет.").catch((err) => console.log(err));
							}
						}
					}else{


						bot.telegram.sendMessage(chatid, answer, extra).catch((err) => console.log(err));

					}


				}else{
					bot.telegram.sendMessage(chatid, "server error").catch((err) => console.log(err));
				}
			})



} else{
	if (body && body.message != ""){
		// bugs not send in notifications
		if (commandNumber != 7 && commandNumber != 8){
			bot.telegram.sendMessage(chatid, body.message).catch((err) => console.log(err));
		}
	}else{
		bot.telegram.sendMessage(chatid, "server error").catch((err) => console.log(err));
	}
}
})
}



bot.command('who', ({ chat }) => {
	
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);

		var collection = db.collection('dbtelegram');

		collection.find({'chatid':chat.id}).count()
		.then(Promise => {

			if (Promise){
				statistic(chat);
				collection.find({'chatid':chat.id}).toArray(function(err, docs) {
					request({
						url: "https://api.rozklad.org.ua/v2/weeks",
						json: true
					}, function (err, res, bod) {
						if (!err && res.statusCode === 200){
							
							
							
							
							var url = "https://api.rozklad.org.ua/v2/groups/"+encodeURIComponent(docs[0].group)+"/timetable";
							request({
								url: url, 
								json: true
							}, function (error, response, body) {
								var answer = "";

								if (!error && response.statusCode === 200) {
									
									var timenow = moment().tz("Europe/Kiev").format('HH')+":"+moment().tz("Europe/Kiev").format('mm')+":00";
									
				//timenow = "14:11:00";
				var t1 = "";
				var t2 = "";
				if (moment().tz("Europe/Kiev").format('e') == 0){
					bot.telegram.sendMessage(chat.id, "Не могу найти преподавателя, сейчас точно пара?").catch((err) => console.log(err));
					return;
				}
				for (var j = 0; j < Object.keys(body.data.weeks[bod.data].days[moment().tz("Europe/Kiev").format('e')].lessons).length; j++) {
				//answer = answer+body.data.weeks[bod.data].days[moment().tz("Europe/Kiev").format('e')].lessons[j].time_start+"\n";
				//answer = answer+body.data.weeks[bod.data].days[moment().tz("Europe/Kiev").format('e')].lessons[j].time_end+"\n";
				if (j == 0){
					t1 = body.data.weeks[bod.data].days[moment().tz("Europe/Kiev").format('e')].lessons[j].time_start;
				}else{
					t1 = body.data.weeks[bod.data].days[moment().tz("Europe/Kiev").format('e')].lessons[(j-1)].time_end;
				}
				t2=body.data.weeks[bod.data].days[moment().tz("Europe/Kiev").format('e')].lessons[j].time_end;
				
				if ((timenow> t1 )&& (timenow < t2)){
					for (var m = 0; m < Object.keys(body.data.weeks[bod.data].days[moment().tz("Europe/Kiev").format('e')].lessons[j].teachers).length; m++) {
						answer= answer+body.data.weeks[bod.data].days[moment().tz("Europe/Kiev").format('e')].lessons[j].teachers[m].teacher_full_name;
					//teacher_rating
				}
			}
		}
		if (!(answer == "" )){
			bot.telegram.sendMessage(chat.id, answer).catch((err) => console.log(err));
		} else {
			bot.telegram.sendMessage(chat.id, "Не могу найти преподавателя, сейчас точно пара?").catch((err) => console.log(err));
		}
		
		
		
		
	}
})

						}
					})
					
				});  	
				db.close;
				return;
			} else {
				bot.telegram.sendMessage(chat.id,errortext,extra);
				db.close;
				return;
			}
		});
	});
	
})




bot.command('full', ({ chat }) => {
	
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);

		var collection = db.collection('dbtelegram');

		collection.find({'chatid':chat.id}).count()
		.then(Promise => {
			
			if (Promise){
				statistic(chat);
				collection.find({'chatid':chat.id}).toArray(function(err, docs) {
					
					var url = "https://api.rozklad.org.ua/v2/groups/"+encodeURIComponent(docs[0].group)+"/timetable";
					request({
						url: url, 
						json: true
					}, function (error, response, body) {
						var answer = "";
						var ans = "";

						if (!error && response.statusCode === 200) {
							

							for (var week  = 1; week <3; week++){
								
								for (var i = 1; i < Object.keys(body.data.weeks[week].days).length+1; i++) {
									if (Object.keys(body.data.weeks[week].days[i].lessons).length == 0) {
										continue;
									}
									ans +="*" +body.data.weeks[week].days[i].day_name+"*"+"\n";
									for (var j = 0; j < Object.keys(body.data.weeks[week].days[i].lessons).length; j++) {

										ans += body.data.weeks[week].days[i].lessons[j].lesson_number+") "+body.data.weeks[week].days[i].lessons[j].lesson_name
										if (body.data.weeks[week].days[i].lessons[j].lesson_type != ""){
											ans += " `"+body.data.weeks[week].days[i].lessons[j].lesson_type+"`"
										}
										if (Object.keys(body.data.weeks[week].days[i].lessons[j].rooms).length != 0){
											ans +="` " +body.data.weeks[week].days[i].lessons[j].rooms[0].room_name+"`"+"\n"
										} else{
											ans +="\n";
										}
										for (var m = 0; m < Object.keys(body.data.weeks[week].days[i].lessons[j].teachers).length; m++) {
											if (body.data.weeks[week].days[i].lessons[j].teachers[m].teacher_full_name !=""){
												if (body.data.weeks[week].days[i].lessons[j].teachers[m].teacher_full_name != ""){
													ans= ans+"     _"+body.data.weeks[week].days[i].lessons[j].teachers[m].teacher_full_name+"_\n";
												}
											}
											
										}
									}
									ans +="\n";
								}
								if (ans != ""){
									ans ="	_Week "+week + "_\n"+ans;
									
									

									bot.telegram.sendMessage(chat.id, ans, extra).catch((err) => console.log(err));
									ans = "";
								}else{
									if(answer == "1"){
										bot.telegram.sendMessage(chat.id, "Пар в расписании .").catch((err) => console.log(err));
									}
									answer="1";
								}
								
							}


						} else{
							if (body && body.message != ""){
								bot.telegram.sendMessage(chat.id, body.message).catch((err) => console.log(err));
							}else{
								bot.telegram.sendMessage(chat.id, "server error").catch((err) => console.log(err));
							}
						}
					})
					
				});  	
				db.close;
				return;
			} else {
				bot.telegram.sendMessage(chat.id,errortext,extra);
				db.close;
				return;
			}
		});
	});
	
})




/*

// dangerous code
bot.command("cleandb", ({ message }) => {

var a = new Array();
var a = [];
MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);
		db.collection('all').find().toArray(function(err, docs) {
			for (var i = 0; i < docs.length; i++) {
				a[i]=docs[i].chatid;
				//console.log(a[i]);
			}		
			for (var m = 0; m < docs.length; m++) {
				for (var j = m+1; j < docs.length; j++) {
				if (m != j && a[m]==docs[j].chatid){
					console.log(docs[m].chatid);
					a[m] = 0;
					//console.log(db.collection('all').deleteOne({'chatid':docs[m].chatid}));
				}
					
			}	
			}	
			console.log("made");
			
			
	 		
	 	}); 
	});	
})


*/


bot.command("notification", ({ chat }) => {
	// status on off, t
	
	//statistic(chat)
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);

		var collection = db.collection('dbtelegram');

		collection.find({'chatid':chat.id}).count()
		.then(Promise => {
			
			if (Promise){		
				collection.find({'chatid':chat.id}).toArray(function(err, docs) {	
					
					if (docs[0].time){
						bot.telegram.sendMessage(chat.id, "_Уведомления активированы!_\n время: "+docs[0].time+"\n выключить: /off",extra);
						db.close;
						return;
					} else {
						bot.telegram.sendMessage(chat.id, "С помощью уведомлений ты можешь получать в выбранное тобой время расписание на следующий день, *чтобы выбрать время напиши /t и время*.\n например \"/t 20:30\"",extra);
						db.close;
						return;
					}
				});
			} else {
				bot.telegram.sendMessage(chat.id,errortext,extra);
				db.close;
				return;
			}
		});
	});
	

})

bot.command("on", ({ chat }) => {
	bot.telegram.sendMessage(chat.id, "Для включения уведомлений выбери время, для этого используй /t").catch((err) => console.log(err));
})

bot.command("off", ({ chat }) => {
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);

		var collection = db.collection('dbtelegram');
		collection.updateOne(
			{ "chatid" : chat.id },
			{
				$set: { "time": undefined}


			}, function(err, results) {

			});
	})
	bot.telegram.sendMessage(chat.id, "_Уведомления выключены_, чтобы снова включить используй /t",extra);
	//off, чтоб снова включить нажмите on
	//t = NULL
})



bot.command("t", ({ chat, message }) => {
	settime(chat, message)
})


var timevar = [...Array(24).keys()];
for(var i=0;i<timevar.length;i++){
	timevar[i]="t"+timevar[i];
}

bot.command(timevar, ({ chat, message }) => {
	settime(chat, message, message.text.replace("/t","").replace("@KPI_schedule_bot","").replace(" ","")+':01')
})

function settime(chat, message, certain){
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);

		var collection = db.collection('dbtelegram');

		collection.find({'chatid':chat.id}).count()
		.then(Promise => {
			
			if (Promise){
				var re = /^([0-1]\d|2[0-3])(:[0-5]\d)/;
				var re2 = /\d:\d\d/;

				var str = message.text.replace("/t","").replace("@KPI_schedule_bot","").replace(" ","");
				if (certain){
					str = certain
				}

				if (!re.exec(str) && re2.exec(str)){
					str = '0'+str 
				}

				if (re.exec(str)){
					bot.telegram.sendMessage(chat.id,"🕓 "+str+"\n*Напоминания активированы!* Теперь в выбранное тобой время будет приходить расписание на следующий день.\n\n Для отключения используй /off", extra);
					MongoClient.connect(url, function(err, db) {
						assert.equal(null, err);

						var collection = db.collection('dbtelegram');
						collection.updateOne(
							{ "chatid" : chat.id },
							{
								$set: { "time": str}


							}, function(err, results) {

							});
					})

				} else{
					bot.telegram.sendMessage(chat.id,"Используй формат _hh:mm_, например \"/t 19:12\"",extra);
				}

			} else {
				
				bot.telegram.sendMessage(chat.id,errortext,extra);
				db.close;
				return;
			}
		});
	});	
}

//инициализация с базы состояния уведомлений
var notificationState = true;
MongoClient.connect(url, function(err, db) {
	assert.equal(null, err);
	db.collection('admin').find({'name': 'main'}).toArray(function(err, docs) {
		notificationState = docs[0].notification
	});
})


//включение и отключение уведомлений
bot.command(secure.admin_notification_control, ({ chat }) => {
	var messageText = "";
	if (notificationState){
		messageText = "_Сервис уведомлений деактивирован._"
	}else{
		messageText = "_Сервис уведомлений активирован._"
	}
	bot.telegram.sendMessage(chat.id, messageText,extra).catch((err) => console.log(err));
	notificationState = !notificationState;
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);

		var collection = db.collection('admin');
		collection.updateOne(
			{ 'name': 'main'},
			{
				$set: { 'notification': notificationState}


			}, function(err, results) {

			});
	})
})

notificationEngine();

function notificationEngine(){
	
	var timerId = setInterval(function() {
		if (notificationState){
			
			MongoClient.connect(url, function(err, db) {
				assert.equal(null, err);
				db.collection('dbtelegram').find().toArray(function(err, docs) {
					
					
					
					for (var j = 0; j < docs.length; j++) {

						if (docs[j].time){
							if (docs[j].time == (moment().tz("Europe/Kiev").format('HH:mm'))){
								
								if (docs[j].time < "11:30" && docs[j].time >"00:00"){
									schedule(docs[j].group, docs[j].chatid,8);
								}else{
									schedule(docs[j].group, docs[j].chatid,7);
								}
						//bot.telegram.sendMessage(secure.admin_id,(moment().tz("Europe/Kiev").format('HH:mm')));
					}
				}
				
			}	

		}); 
			});	
			
			if (moment().tz("Europe/Kiev").format('HH:mm') == "08:05"){
				bot.telegram.sendMessage(secure.admin_id,moment().tz("Europe/Kiev").format('dddd, MMMM Do')).catch((err) => console.log(err));

			}

		}
	}, 60000);
	
}

bot.command('right', ({ chat}) => {
	bot.telegram.sendMessage(chat.id, "Sorry, I'm not a navigator.", extra).catch((err) => console.log(err));
})

bot.command('left', ({ chat }) => {
	
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);

		var collection = db.collection('dbtelegram');

		collection.find({'chatid':chat.id}).count()
		.then(Promise => {

			if (Promise){
				statistic(chat);
				collection.find({'chatid':chat.id}).toArray(function(err, docs) {
					request({
						url: "https://api.rozklad.org.ua/v2/weeks",
						json: true
					}, function (err, res, bod) {
						if (!err && res.statusCode === 200){
							
							
							
							
							var url = "https://api.rozklad.org.ua/v2/groups/"+encodeURIComponent(docs[0].group)+"/timetable";
							request({
								url: url, 
								json: true
							}, function (error, response, body) {
								var answer = "";

								if (!error && response.statusCode === 200) {
									
									var timenow = moment().tz("Europe/Kiev").format('HH')+":"+moment().tz("Europe/Kiev").format('mm')+":00";
									
				//timenow = "14:11:00";
				var t1 = "";
				var t2 = "";
				var t3 = "";
				if (moment().tz("Europe/Kiev").format('e') == 0){
					bot.telegram.sendMessage(chat.id, "Не могу посчитать время, сейчас точно пара?").catch((err) => console.log(err));
					return;
				}
				for (var j = 0; j < Object.keys(body.data.weeks[bod.data].days[moment().tz("Europe/Kiev").format('e')].lessons).length; j++) {
				//answer = answer+body.data.weeks[bod.data].days[moment().tz("Europe/Kiev").format('e')].lessons[j].time_start+"\n";
				//answer = answer+body.data.weeks[bod.data].days[moment().tz("Europe/Kiev").format('e')].lessons[j].time_end+"\n";
				
				t1 = body.data.weeks[bod.data].days[moment().tz("Europe/Kiev").format('e')].lessons[j].time_start;
				
				t2=body.data.weeks[bod.data].days[moment().tz("Europe/Kiev").format('e')].lessons[j].time_end;
				
				if (j == 0){
					if ((timenow < t1)){
						var z = -1* parseInt(moment(moment().tz("Europe/Kiev").format("HH:mm:ss"),"HH:mm:ss").diff(moment(t1, "HH:mm"),"seconds"));
						answer+="До начала пары осталось: "
						answer+="*"+parseInt(z/60)+" мин "+z%60+" сек*\n"
						
						
						
					}
					
				}else{
					t3 = body.data.weeks[bod.data].days[moment().tz("Europe/Kiev").format('e')].lessons[(j-1)].time_end;

					
					
					if ((timenow>= t3 )&& (timenow < t1)){
						if (timenow==t3){
							answer+="Пара закончилась. \n"
						}
						var z = -1* parseInt(moment(moment().tz("Europe/Kiev").format("HH:mm:ss"),"HH:mm:ss").diff(moment(t1, "HH:mm"),"seconds"));
						answer+="До конца перемены осталось: "
						answer+="*"+parseInt(z/60)+" мин "+z%60+" сек*\n"
						
						
						
					}
				}
				
				if ((timenow>= t1 )&& (timenow < t2)){
					var z = -1* parseInt(moment(moment().tz("Europe/Kiev").format("HH:mm:ss"),"HH:mm:ss").diff(moment(t2, "HH:mm"),"seconds"));
					answer+="До конца пары осталось: "
					answer+="*"+parseInt(z/60)+" мин "+z%60+" сек*\n"
					
					
					
				}
			}
			if (!(answer == "" )){
				bot.telegram.sendMessage(chat.id, answer, extra).catch((err) => console.log(err));
			} else {
				bot.telegram.sendMessage(chat.id, "Не могу посчитать время, сейчас точно пара?").catch((err) => console.log(err));
			}
			
			
			
			
		}
	})
							
						}
					})
					
				});  	
				db.close;
				return;
			} else {
				bot.telegram.sendMessage(chat.id,errortext,extra);
				db.close;
				return;
			}
		});
	});
	
})

// exam
bot.command('exam', ({ chat, message }) => {
	exam(chat, message);
})	

bot.command('exams', ({ chat, message }) => {
	exam(chat, message);
})	

function exam(chat, message){


	statistic(chat)
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);
		
		var collection = db.collection('dbtelegram');

		collection.find({'chatid':chat.id}).count()
		.then(Promise => {

			if (Promise){
				collection.find({'chatid':chat.id}).toArray(function(err, docs) {
					
					urlForExams = "https://api.rozklad.org.ua/v2/groups/"+encodeURIComponent(docs[0].group);
					request({
						url: urlForExams,
						json: true
					}, function (err, res, bod) {
						if (!err && res.statusCode === 200){
							answer="";
							;
							urlForExams = "http://rozklad.kpi.ua/Schedules/ViewSessionSchedule.aspx?g="+bod.data.group_url.split("g=")[1];
							request({
								url: urlForExams,
								json: true
							}, function (err, res, bod) {
								if (!err && res.statusCode === 200){
									answer="";

									var result = bod.match( /<td>(\d\d\/\d\d\/\d\d\d\d)<\/td><td>.*>(.*)<\/a>.*title="(.*)">.*">(.*)<\/a>.*(\d\d:\d\d)<\/td>/g);
									if (result == null){
										bot.telegram.sendMessage(chat.id,"_Твой деканат еще не добавил экзамены в базу КПИ._",extra).catch((err) => console.log(err));
									}else{
										for (i in result){
											var result2 = result[i].match( /<td>(\d\d\/\d\d\/\d\d\d\d)<\/td><td>.*>(.*)<\/a>.*title="(.*)">.*">(.*)<\/a>.*(\d\d:\d\d)<\/td>/)
											var data = result2[1].match(/(\d\d)\/(\d\d)\/(\d\d\d\d)/)
											answer+="*"+data[2]+"/"+data[1]+"/"+data[3]+"*  " + result2[5]+"\n_" + result2[4]+"_\n " + result2[2]+"\n " + result2[3]+"\n\n"



										}


										bot.telegram.sendMessage(chat.id,answer,extra).catch((err) => console.log(err));
									}

								}else{
									bot.telegram.sendMessage(chat.id,"_База экзаменов КПИ сейчас лежит._",extra).catch((err) => console.log(err));
								}									
							})										
						}				
					})	
					

				});  	
				db.close;
				return;
			} else {
				bot.telegram.sendMessage(chat.id,errortext,extra).catch((err) => console.log(err));
				db.close;
				return;
			}
		});
	});
	
}

// lower only admin stuff


// управление рассылкой
m=0;
bot.command(secure.show_m, ({ chat }) => {
	bot.telegram.sendMessage(secure.admin_id,m).catch((err) => console.log(err));
})

bot.command(secure.reload_m, ({ chat }) => {
	m=0
})

var textToSend = "";

bot.command(secure.mess_show_text, ({ chat }) => {
	if (textToSend != ""){
		bot.telegram.sendMessage(secure.admin_id,textToSend, extra).catch((err) => console.log(err));
	}
})

bot.command(secure.mess_set_text, ({ chat,message }) => {
	textToSend = message.text.replace("/textSet ","").replace("@KPI_schedule_bot","");
	m=0;
})

bot.command(secure.mess_send, ({ chat }) => {

	if (textToSend != ""){
		MongoClient.connect(url, function(err, db) {
			assert.equal(null, err);
			db.collection('dbtelegram').find().toArray(function(err, docs) {


				for (var j = m; j < m+500; j++) {
					if (j < docs.length){
						if (j+1 == docs.length){
							bot.telegram.sendMessage(secure.admin_id,"Рассылка выполнена.");
						}


						console.log(j);
						bot.telegram.sendMessage(docs[j].chatid,textToSend,extra).catch((err) => console.log(err));
					}
				}
				m=j;
				if (j < docs.length){
					bot.telegram.sendMessage(secure.admin_id,(m/docs.length*100).toFixed(2) + "%",extra).catch((err) => console.log(err));
				}else{
					bot.telegram.sendMessage(secure.admin_id,"100.00" + "%",extra).catch((err) => console.log(err));
				}

			}); 
		});	
	}
	
})

// рассылка для тех кто не активировал уведомления 
bot.command(secure.mess_notif, ({ chat }) => {

	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);
		db.collection('dbtelegram').find().toArray(function(err, docs) {

			for (var j = m; j < m+500; j++) {
				if (j < docs.length){
					if (j+1 == docs.length){
						bot.telegram.sendMessage(secure.admin_id,"we did it (send)");
					}

					if (! docs[j].time){
						console.log(j);

						var html = new function() {
							this.parse_mode = "HTML";
						};	

						// change markdown!
						// var ntext = "🕟 C помощью уведомлений ты можешь получать в выбранное тобой время расписание на следующий день.\n\n Для выбора времени используй <b>\"/t hh:mm\"</b> \n Например, \"/t 21:32\""
						

						var ntext1 = "🌋 <b> 4390 раз </b>\n- столько в день в среднем @KPI_schedule_bot отвечает на команды.\n\n Ты можешь получать в выбранное тобой время расписание на следующий день. Для выбора времени используй <i>\"/t hh:mm\"  </i>\n\n 🕟 <b>Либо просто нажми на:</b> \n /t20 - для 20:01 \n /t21 - для 21:01"

						// bot.telegram.sendMessage(secure.admin_id,ntext, html).catch((err) => console.log(err));
						bot.telegram.sendMessage(docs[j].chatid,ntext1, html).catch((err) => console.log(err));
						
						
					} else{
						var ntext2 = "🌋 <b> 4390 раз </b>\n- столько в день в среднем @KPI_schedule_bot отвечает на команды."

						bot.telegram.sendMessage(docs[j].chatid,ntext2, html).catch((err) => console.log(err));

					}
				}				
			}
			m=j;
			if (j < docs.length){
				bot.telegram.sendMessage(secure.admin_id,(m/docs.length*100).toFixed(2) + "%",extra).catch((err) => console.log(err));
			}else{
				bot.telegram.sendMessage(secure.admin_id,"100.00" + "%",extra).catch((err) => console.log(err));
			}		
		}); 
	});		
})

// рассылка для тех кто не смог ввести название группы (не оптимизированно)
bot.command(secure.mess_for_zero, ({ chat }) => {


	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);
		db.collection('dbtelegram').find().toArray(function(err, docs) {
			
			var h = true;
			db.collection('all').find().toArray(function(err, doc) {
				for (var j = 0; j < doc.length; j++) {
					h = true;
					for (var i = 0; i < docs.length; i++) {
						if (doc[j].chatid ==docs[i].chatid ){
							h=false;
							
							
						}						
						
					}
					if (h){
						console.log(doc[j].chatid);

						bot.telegram.sendMessage(doc[j].chatid, "Привет. *Теперь комманда */r* если не найдет группу в базе, выполнит поиск и покажет список.*\n Например \"/r ка6\" покажет все группы, которые начинаются на \"ка6\", попробуй!", extra).catch((err) => console.log(err));

						
					}

				}		
				
			})	
			
		}); 
	});	
	bot.telegram.sendMessage(chat.id, "Привет. *Теперь комманда */r* если не найдет группу в базе, выполнит поиск и покажет список.*\n Например \"/r ка6\" покажет все группы, которые начинаются на \"ка6\", попробуй!", extra).catch((err) => console.log(err));
})



bot.command(secure.admin_statistic, ({ chat, from}) => {
	
	request({
		url: "https://api.rozklad.org.ua/",
		json: true
	}, function (err, res, bod) {
		if (!err && res.statusCode === 200){
			answerS="";
			
			var result = bod.match( /Последний апдейт db: <strong>(\d\d.\d\d.\d\d\d\d)<\/strong>/i );

			answerS = "Дата обновления базы: *"+ result[1] + "*\n";
			result = bod.match( /Последний апдейт api: <strong>(\d\d.\d\d.\d\d\d\d)<\/strong>/i );
			answerS += "Дата обновления api: *"+ result[1] + "*\n\n";
			
			MongoClient.connect(url, function(err, db) {
				assert.equal(null, err);

				

				db.collection('all').find().toArray(function(err, docs) {
					var amountofusers = docs.length;
					var amountof0 = 0;
					var amountof1 = 0;
					var amountofstat = 0;
					
					for (var j = 0; j < docs.length; j++) {

						if (docs[j].stat == 0){
							amountof0++;
						}
						if (docs[j].stat == 1){
							amountof1++;
						}
						amountofstat += docs[j].stat;
					}
					answerS += "start users: *" + amountofusers+"*";
					answerS += " (0: " + amountof0 + ")\n";
					answerS += "0: _"+(amountof0/amountofusers*100).toFixed(2)+"%_, ";
					answerS += "1: _"+(amountof1/amountofusers*100).toFixed(2)+"%_, ";
					answerS += "2+: _"+((amountofusers - amountof0 - amountof1)/amountofusers*100).toFixed(2)+"%_\n\n ";
					
					answerS+="stat: *"+amountofstat+"* ("+(amountofstat/amountofusers).toFixed(2)+" per user)";
					db.collection('dbtelegram').find().toArray(function(err, doc) {
						
						var notstat = 0;
						
						for (var j = 0; j < doc.length; j++) {

							if (doc[j].time){
								notstat++;
							}
						}	
						answerS += "\n _Notification users_: "+notstat;
						
						var messageText = "";
						if (notificationState){
							messageText = "_Уведомления активированы._"
						}else{
							messageText = "_Уведомления деактивированы._"
						}
						answerS += "\n" + messageText;
						
						bot.telegram.sendMessage(chat.id, answerS, extra).catch((err) => console.log(err));
						db.close;
					});		
					
				})
				
				
			})						
		}				
	})				
})

bot.command(secure.admin_help, ({ chat}) => {
	text = ''

	text += '/' + secure.admin_statistic + ' - статистика \n'
	text += '/' + secure.admin_notification_control + ' - включение\\отключение уведомлений\n'
	text += '\n управление рассылка:\n'
	text += '/' + secure.show_m + ' - показать m\n'
	text += '/' + secure.reload_m + ' - обнулить m\n'
	text += '/' + secure.mess_set_text + ' - set text\n'
	text += '/' + secure.mess_show_text + ' - show text\n'
	text += '/' + secure.mess_send + ' - send messages\n'
	// text += '/' + secure.mess_notif + '\n'
	// text += '/' + secure.mess_for_zero + '\n'
	text += '/' + secure.admin_help + ' - this\n'


	bot.telegram.sendMessage(secure.admin_id, text).catch((err) => console.log(err));
})


/*
bot.command(!!!, ({ chat }) => {
	

	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);
		db.collection('dbtelegram').find().toArray(function(err, docs) {
			
			


			for (var j = m; j < m+500; j++) {
				if (j < docs.length){
					if (j+1 == docs.length){
						bot.telegram.sendMessage(secure.admin_id,"we did it (send)");
					}

					if (docs[j].newstat){
						console.log(j);
						

						bot.telegram.sendMessage(docs[j].chatid,docs[j].newstat,extra).catch((err) => console.log(err));



						
					}
				}
				
			}
			m=j;

			

		}); 
	});	

	
})


bot.command('stat_6', ({ chat, reply }) => {
	
	MongoClient.connect(url, function(err, db) {
		assert.equal(null, err);
		db.collection('dbtelegram').find().toArray(function(err, docs) {
					var rroom = new Array(0)
					var tteacher = new Array(0)
					var o = -1;
			var timerId = setInterval(function() {
				o++;
				
				if (o == 100){
					bot.telegram.sendMessage(secure.admin_id, "we did it!");
					return;
				}

				
				var url = "https://api.rozklad.org.ua/v2/groups/"+encodeURIComponent(docs[o].group)+"/timetable";
				request({url: url, json: true}, function (error, response, body) {
					var lessons = 0;
					var lessonsweek1 = 0;


					if (!error && response.statusCode === 200) {


						for (var week  = 1; week <3; week++){

							for (var i = 1; i < Object.keys(body.data.weeks[week].days).length+1; i++) {
								if (Object.keys(body.data.weeks[week].days[i].lessons).length == 0) {
									continue;
								}

								for (var j = 0; j < Object.keys(body.data.weeks[week].days[i].lessons).length; j++) {
									if (week == 1){
										lessonsweek1++;
									}
									lessons+=1;


									if (Object.keys(body.data.weeks[week].days[i].lessons[j].rooms).length != 0  ){
										if (body.data.weeks[week].days[i].lessons[j].rooms[0].room_name != ""){
											rroom.push(body.data.weeks[week].days[i].lessons[j].rooms[0].room_name)
										}
									} 

									for (var m = 0; m < Object.keys(body.data.weeks[week].days[i].lessons[j].teachers).length; m++) {
										if (body.data.weeks[week].days[i].lessons[j].teachers[m].teacher_full_name !=""){

											tteacher.push(body.data.weeks[week].days[i].lessons[j].teachers[m].teacher_full_name)

										}
									}


								}

							}


						}

						if (lessons == 0){
							console.log(o + " has 0")
						}else{

						var rrr = mode(rroom)
						var ttt = mode(tteacher)

						var ans = "Немножко интересных фактов\n\n"
						ans += "Всего пар: *"+lessons+"*\n На первой неделе: *"+lessonsweek1+" ("+(1.5*lessonsweek1)+" часов)"+"*\n На второй неделе: *"+(lessons-lessonsweek1)+" ("+(1.5*(lessons-lessonsweek1))+" часов)"+"*\n ";
						if (rrr != ""){
							ans +="\nБольше всего пар в аудитории: _"+rrr + "_"
						}
						if (ttt != ""){
							ans +="\nПреподаватель, которого ты видишь чаще всего: _ "+ttt + "_"
						}
						console.log("-11111-")
						console.log(o)
						console.log(docs[o].chatid)
						console.log(ans)
						var collection = db.collection('dbtelegram');
						collection.updateOne(
						{ "chatid" : docs[o].chatid},
						{
						$set: { "newstat": ans}


						}, function(err, results) {

						});
						//bot.telegram.sendMessage( docs[o].chatid, ans, extra).catch((err) => console.log(err));
						}
						rroom = []
						tteacher = []
						ans = ""
					}
				})







				console.log("-22222-")
				console.log(docs[o].chatid)
				//console.log(ans)
				
			}, 3000);

			

		}); 
	});	
	
	
	
	
	
})



function mode(array)
{
	if(array.length == 0)
		return null;
	var modeMap = {};
	var maxEl = array[0], maxCount = 1;
	for(var i = 0; i < array.length; i++)
	{
		var el = array[i];
		if(modeMap[el] == null)
			modeMap[el] = 1;
		else
			modeMap[el]++;  
		if(modeMap[el] > maxCount)
		{
			maxEl = el;
			maxCount = modeMap[el];
		}
	}
	return maxEl;
}*/