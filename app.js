const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');
const app = express();
const config = require('./config');

const port = config.port;

// create connection to database
// the mysql.createConnection function takes in a configuration object which contains host, user, password and the database name.
const db = mysql.createConnection ({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database
});

// connect to database
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});
global.db = db;

//entries contain the database entries(where the overflow may occur) for the result
//starts contain information regarding the usage of auto_incremented value
var entries, stats;


//entry point to trigger the event. This can be simple GET request from any client or it may be a POST request from Slack's /command
app.post("/", function(req,res,next) {
	db.query('select * from schema_auto_increment_columns where auto_increment_ratio > 0.8', function (error, results, fields) {
	  if (error) throw error;
	  formatData(results); //we need to format the data for use in Slack's webhooks.
	  //console.log(entries);
	  var responseURL = config.slack.url;
	  var message = {
	    "text": "Database Entries running out of IDs",
	    "attachments": [
        {
          "fields": [
						{
							"title": "Database Entry",
							"value": entries,
							"short": true
						},
						{
							"title": "% Used",
							"value": stats,
							"short": true
						}
					]
      	}
	    ]
		}
	  //console.log(message)
	  sendMessageToSlackResponseURL(responseURL, message);
	  res.send('Message sent to slack');
	});
});

function formatData(data) {
	stats = ""; entries = ""; //reset the value

	var dbname = "";
  var tablename = "";
  var columnname = "";
  var type = "";
  var maxval = "";
  var nextval = "";
  var ratio = "";
	for(var i = 0; i < data.length; i++) {
  	var d = data[i];
  	//console.log(d)
  	for(var key in d) {
	  	if (d.hasOwnProperty(key)) {
	  		switch(key) {
	  			case "table_schema": {
	  				dbname = d[key];
	  				break;
	  			}

	  			case "table_name": {
	  				tablename = d[key];
	  				break;
	  			}

	  			case "column_name": {
	  				columnname = d[key];
	  				break;
	  			}

	  			case "data_type": {
	  				type = d[key];
	  				break;
	  			}

	  			case "max_value": {
	  				maxval = d[key];
	  				break;
	  			}

	  			case "auto_increment": {
	  				nextval = d[key];
	  				break;
	  			}

	  			case "auto_increment_ratio": {
	  				ratio = d[key]*100;
	  				break;
	  			}
	  		}
		  }
	  }
	  entries = entries + dbname + "." + tablename + "." + columnname + "\n";
	  stats = stats + ratio + "% (" + type + "; MAX: " + maxval + "; NEXT: " + nextval + ")\n";
  }
}

function sendMessageToSlackResponseURL(responseURL, JSONmessage){
    var postOptions = {
        uri: responseURL,
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        json: JSONmessage
    }
    request(postOptions, (error, response, body) => {
        if (error){
            // handle errors as you see fit
        }
    })
}

// configure middleware
app.set('port', process.env.port || port); // set express to use this port
app.set('views', __dirname + '/views'); // set express to look in this folder to render our view
app.set('view engine', 'ejs'); // configure template engine
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // parse form data client
app.use(express.static(path.join(__dirname, 'public'))); // configure express to use public folder

// set the app to listen on the port
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});