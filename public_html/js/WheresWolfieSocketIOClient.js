var mapProp;
var map;
var numWins;
var socket;
var marker;

function initGame()
{
    google.maps.event.addDomListener(window, 'load', initialize);
    // each player starts with 0 wins
    numWins = 0;
    updateNumWins();
    // to use later for testing whether a marker exists
    // to be cleared from the map
    marker = null;
    initConnection();
    initHandler();
}

function initialize()
{
    mapProp = {
        center:new google.maps.LatLng(41.9,12.4833),
        // change the zoom until it looks about right
        zoom:7,
        mapTypeId:google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("googleMap"),mapProp);
}

// called each time this player wins a game
function updateNumWins()
{
    var numWinsDiv = document.getElementById("numWinsDiv");
    // display the number of wins with a diamond one space over from each side
    $(numWinsDiv).text("\u2666\u00a0" + "Number of Wins: " + numWins + "\u00a0\u2666");
}

function initConnection()
{
    // connect to the server
    socket = io.connect('//localhost:3000');
    
    // handle when the server sends a notification of
    // an invalid guess back to the client
    socket.on('invalidGuess', function(data) {
        // display the distance message to the user
        var feedbackDiv = document.getElementById("feedback");
        $(feedbackDiv).text(data.message);
    });
    socket.on('error', function() { console.error(arguments); });
    
    // handle when the server sends information back
    // to the client: the coordinates of the city the
    // user guessed, its distance to the secret location,
    // and a message to display to the user that
    // addresses him by name and lets him know of this
    // distance
    socket.on('gameFeedback', function(data) {
        // center the map on the guessed city
        map.setCenter(new google.maps.LatLng(data.coordinates[0],data.coordinates[1]));
        // zoom in on the guessed city
        map.setZoom(10);
        // add a marker to the map at the guessed city
        marker = new google.maps.Marker({
            map: map,
            position: new google.maps.LatLng(data.coordinates[0],data.coordinates[1])
        });
        marker.setMap(map);
        // when the user clicks on the marker, it
        // will display the distance between the
        // guessed city and the secret location 
        var infowindow = new google.maps.InfoWindow({
            content:"Distance to the secret location: " + data.distance + " kilometers"
        });
        google.maps.event.addListener(marker, 'click', function(){
            infowindow.open(map,marker);
        });
        
        // display the distance message to the user
        var feedbackDiv = document.getElementById("feedback");
        $(feedbackDiv).text(data.message);
    });
    socket.on('error', function() { console.error(arguments); });
    
    // handle when the server sends a notification of victory
    // (whether the user's own or another user's) back to the
    // client
    socket.on('victoryFeedback', function(data) {
        // center the map on the secret location
        map.setCenter(new google.maps.LatLng(data.coordinates[0],data.coordinates[1]));
        // zoom in on the secret location
        map.setZoom(10);
        // get the name of the file of the Wolfie
        // image to use as the marker icon
        var path = document.URL;
        var indexLocation = path.indexOf("index.html");
        path = path.substring(0, indexLocation);
        var filename = path + "images/Wolfie.png";
        // add a marker to the map at the secret location
        marker = new google.maps.Marker({
            map: map,
            position: new google.maps.LatLng(data.coordinates[0],data.coordinates[1]),
            icon: filename
        });
        marker.setMap(map);
        // display the victory message to the user
        var feedbackDiv = document.getElementById("feedback");
        $(feedbackDiv).text(data.victoryMessage);
    });
    socket.on('error', function() { console.error(arguments); });
    
    // handle when the server sends back to the client a
    // notification that his win-count needs to be incremented
    socket.on('numWinsFeedback', function(data) {
        numWins++;
        updateNumWins();
    });
    socket.on('error', function() { console.error(arguments); });
}

function initHandler()
{
    var guessTextField = document.getElementById("playerGuess");
    $(guessTextField).keyup(function(ev){
        // check if the user pressed enter while inside the
        // guess text field
        if (ev.keyCode === 13)
        {
           sendGuess();
        }
    });
}

function sendGuess()
{
    // clear any previous marker from the map
    if (marker !== null)
    {
        marker.setMap(null);
    }
    
    // retrieve the values that the user typed in to the
    // name and guess text fields
    var nameTextField = document.getElementById("playerName");
    var guessTextField = document.getElementById("playerGuess");
    var nameText = $(nameTextField).val();
    var guessText = $(guessTextField).val();
    
    // send to the server the user's name and the city he guessed, as well
    // as the URL of the document in order to be able to access the text
    // file containing the city names from the server
    socket.emit('guess', {playerName: nameText, playerGuess: guessText});
}




