require('dotenv').config()

const http = require('http');
const express = require('express');
const session = require('express-session');
const dateObject = new Date();
const date = (`0${dateObject.getDate()}`).slice(-2);
const year = dateObject.getFullYear();
const month = (`0${dateObject.getMonth()+1}`).slice(-3);
const hours = dateObject.getHours();
const minutes = dateObject.getMinutes();
const seconds = dateObject.getSeconds();

var randomHex = require('randomhex');
var querystring = require('querystring');

const app = express();

app.use(session({
    secret: process.env.CLIENT_SECRET,
    resave: false,
    saveUninitialized: true
}));


app.get('/', function(req,res){
    res.send('Hello World!');
});


app.get('/login', function (req, res) {
    const authEndpoint = 'http://localhost:8080/realms/cyber_security/protocol/openid-connect/auth';
    const queryParams = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.CLIENT_ID,
      redirect_uri: process.env.REDIRECT_URI,
      scope: 'openid',
      state : randomHex(16)
    })
  
    const authUrl = `${authEndpoint}?${queryParams}`
    console.log(`${year}-${month}-${date} ${hours}:${minutes}:${seconds}` + " INFO " + "redirecting login: " + authUrl)
    res.redirect(authUrl)
});

app.get('/callback', async (req, res) => {
    const { code } = req.query

    var requestBody = querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: process.env.REDIRECT_URI
    });

    var requestParams = {
        host: 'localhost',
        method: 'POST',
        port: 8080,
        path: '/realms/cyber_security/protocol/openid-connect/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': requestBody.length
        }
    };

        
    getToken(requestParams, requestBody).then(function() {
        console.log("redirecting to user");
        res.redirect('/user');
    });        

});

app.get('/user', async (req, res) => {
    let bearer = querystring.stringify({
        Bearer: `${req.session.accessToken}`
    });

    let authorization = querystring.stringify({
        Authorization: bearer
    })

    var requestParams = {
        host: 'localhost',
        method: 'GET',
        port: 8080,
        path: '/realms/cyber_security/protocol/openid-connect/user',
        headers: authorization
    };

    console.log(`${year}-${month}-${date} ${hours}:${minutes}:${seconds}` + " INFO " +  "redirected user");
    const response = http.request(requestParams, (resp) => {
        let data = '';

        resp.on('data', (chunk) => {
            console.log("GET chunk: " + chunk);
            data += chunk;
        });

        resp.on('end', () => {
            console.log("GET end of response: " + data);
        });

    }).on("error", (err) => {
        console.log("GET Error: " + err);
    });
        
    res.send(response);
});


function getToken(requestParams, requestBody){
    return new Promise((resolve, reject) => {
        const req = http.request(requestParams, response => {
            if (response.statusCode < 200 || response.statusCode >= 300) {
                return reject(new Error(`Status Code: ${response.statusCode}`));
            }
        
            const data = [];
            response.on("data", chunk => {
                data.push(chunk);
            });
        
            response.on("end", () => resolve(Buffer.concat(data).toString()));
        });
        
        req.on("error", reject);

        if (requestBody) {
            req.write(requestBody);
        }
            
        req.end();
    });
}

app.listen(3000, () => {
    console.log('Server listening on http://localhost:3000')
})