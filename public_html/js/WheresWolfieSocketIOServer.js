var secretLocation;
// give it a null value to use later for testing
// whether the city names have been read from the
// file yet
var cities = null;

// WE'LL NEED THIS TO MAKE OUR Socket.io TCP SOCKET
var http = require('http');

// THIS IS A Node.js SOCKET, WHICH WE'LL NEED TO MAKE THE Socket.io SOCKET
var app = http.createServer();

// HERE IT IS, THE Socket.io SOCKET FOR THE TCP COMMUNICATIONS
var io = require('socket.io').listen(app);

var users = new Array();

io.sockets.on('connection', function(socket) {
    users.push(socket);
    // select the secret location if it hasn't been
    // selected yet
    if (cities === null)
    {
        // for storing the 100 cities from which the server
        // picks the secret location;
        cities = new Array();
        getPossibleCities(function(cityOptions){
            for (var i = 0; i < cityOptions.length; i++)
            {
                cities[i] = cityOptions[i];
            }
            
            // generate a random number between 0 and 99
            var randomNum = Math.floor((Math.random()*100));
            // use that random number as the index into the
            // cities array to select a random city to use
            // as the secret location
            secretLocation = cities[randomNum];
        });
    }
    
    // handle when the user sends a guess to the server
    socket.on('guess', function(data) {
        processGuess(data, socket);
    });
});

function processGuess(data, socket)
{
    // check to see if the city the user guessed is
    // one of the 100 possible choices
    var isValid = false;
    var playerGuess;
    
    for (var i = 0; i < cities.length; i++)
    {
        var cityName = cities[i].split("|");
        // make guesses case-insensitive
        if (data.playerGuess.toUpperCase() === cityName[0].toUpperCase())
        {
            playerGuess = cities[i];
            isValid = true;
            break;
        }
    }
    
    // if it isn't,
    if (isValid === false)
    {
        // format whatever guess the player typed in so that the
        // first letter is uppercase and the rest are lowercase
        var formattedGuess;
        var firstLetter;
        var restOfWord;
        firstLetter = data.playerGuess.substring(0,1);
        firstLetter = firstLetter.toUpperCase();
        restOfWord = data.playerGuess.substring(1);
        restOfWord = restOfWord.toLowerCase();
        formattedGuess = firstLetter + restOfWord;
        // let the user know
        var messageToSend = "Sorry, " + formattedGuess + " is not one of the possible cities.";
        socket.emit('invalidGuess', {message: messageToSend});
    }
    // otherwise, proceed with processing the guess
    else
    {
        if (playerGuess !== secretLocation)
        {
            // separate out the city's latitude and longitude
            // from the city name
            var guessedLatLong = playerGuess.split("|");
            var guessedCoordinates = new Array();
            for (var i = 0; i < 2; i++)
            {
                // convert the latitude and longitude from Strings to
                // floats
                guessedCoordinates[i] = parseFloat(guessedLatLong[i+1]);
            }
            // separate out the secret location's latitude and longitude
            // from the city name
            var secretLatLong = secretLocation.split("|");
            var secretCoordinates = new Array();
            for (var i = 0; i < 2; i++)
            {
                // convert the latitude and longitude from Strings to
                // floats
                secretCoordinates[i] = parseFloat(secretLatLong[i+1]);
            }
            
            var calculatedDistance = calculateDistance(guessedCoordinates, secretCoordinates);
            
            // format whatever guess the player typed in so that the
            // first letter is uppercase and the rest are lowercase
            var formattedGuess;
            var firstLetter;
            var restOfWord;
            firstLetter = data.playerGuess.substring(0,1);
            firstLetter = firstLetter.toUpperCase();
            restOfWord = data.playerGuess.substring(1);
            restOfWord = restOfWord.toLowerCase();
            formattedGuess = firstLetter + restOfWord;
            
            var messageToDisplay = data.playerName + ", " + formattedGuess + " is "
                        + calculatedDistance + " kilometers from the secret location.";
            
            // send back to the client all of the necessary
            // information
            socket.emit('gameFeedback', {coordinates: guessedCoordinates, 
                distance: calculatedDistance, message: messageToDisplay});
        }
        // otherwise, initiate the end of the game
        else
        {
            // separate out the city's latitude and longitude
            // from the city name
            var guessedLatLong = playerGuess.split("|");
            var guessedCoordinates = new Array();
            for (var i = 0; i < 2; i++)
            {
                // convert the latitude and longitude from Strings to
                // floats
                guessedCoordinates[i] = parseFloat(guessedLatLong[i+1]);
            }
            
            // send back to the client who won a message
            // letting him know
            var victoryMsg1 = "Congratulations " + data.playerName + ", you \n\
                have guessed the secret location!";
            socket.emit('victoryFeedback', {coordinates: guessedCoordinates, 
                victoryMessage: victoryMsg1});
            
            // send back to all other clients a message
            // letting them know which user has won
            var victoryMsg2 = data.playerName + " has guessed the secret location!";
            socket.broadcast.emit('victoryFeedback', {coordinates: guessedCoordinates,
                victoryMessage: victoryMsg2});
            
            // send back to the client who won a message
            // to indicate that his win-count should be
            // incremented
            var numWinsMsg = "Increment number of wins.";
            socket.emit('numWinsFeedback', {numWinsMessage: numWinsMsg});
             
            // set the secret location to a new random
            // city
            var randomNum = Math.floor((Math.random()*100));
            secretLocation = cities[randomNum];
        }
    }
}

// THIS SERVER WILL LISTEN ON PORT 3000
app.listen(3000);

// read in from a file the names of 100 cities
// that will serve as the options from which the
// secret location is chosen
function getPossibleCities(callback)
{
    // get the name of the file from which to read in
    // the city names
    var filename = "../text_files/cities.txt";

    // read in the city names from the file
    var fs  = require("fs");
    fs.readFile(filename, "utf-8", function(err, data){
        // each name is on its own line in the file,
        // so make each line its own element in an
        // array
        callback(data.split('\n'));
    });
}

// calculate the distance between two latitude,
// longitude pairs
function calculateDistance(guessedCoords, secretCoords)
{
    var guessedLat = guessedCoords[0];
    var guessedLong = guessedCoords[1];
    var secretLat = secretCoords[0];
    var secretLong = secretCoords[1];
    var guessedLatRad = Math.PI * guessedLat/180;
    var secretLatRad = Math.PI * secretLat/180;
    var guessedLongRad = Math.PI * guessedLong/180;
    var secretLongRad = Math.PI * secretLong/180;
    var thetaDeg = guessedLong - secretLong;
    var thetaRad = Math.PI * thetaDeg/180;
    var distance = Math.sin(guessedLatRad) * Math.sin(secretLatRad) + Math.cos(guessedLatRad) * Math.cos(secretLatRad) * Math.cos(thetaRad);
    distance = Math.acos(distance);
    distance = distance * 180/Math.PI;
    distance = distance * 60 * 1.1515;
    // get the distance in kilometers
    distance = distance * 1.609344;
    // round the distance to two decimal places
    distance = Math.round(distance * 100) / 100;
    return distance;
}