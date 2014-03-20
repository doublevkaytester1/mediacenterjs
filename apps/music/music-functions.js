var file_utils = require('../../lib/utils/file-utils')
    , os = require('os')
    , metafetcher = require('../../lib/utils/metadata-fetcher')
	, config = require('../../lib/handlers/configuration-handler').getConfiguration();

var metaType = "music";

// Init Database
var dblite = require('dblite')
if(os.platform() === 'win32'){
    dblite.bin = "./bin/sqlite3/sqlite3";
}
var db = dblite('./lib/database/mcjs.sqlite');
db.on('info', function (text) { console.log(text) });
db.on('error', function (err) { console.error('Database error: ' + err) });

exports.loadItems = function(req, res){
    fetchData(req, res, metaType);
};

exports.playTrack = function(req, res, albumTitle, trackName){
	var music_playback_handler = require('./music-playback-handler');

	music_playback_handler.startTrackPlayback(res, albumTitle, trackName);
};

/** Private functions **/


fetchData = function(req, res, metaType) {

    //TODO: Make this a promise
    var count = 0;
    metafetcher.fetch(req, res, metaType, function(state){
        if(state === 'done'){
            db.query('SELECT * FROM albums', {
                    album 		    : String,
                    artist  	    : String,
                    year            : String,
                    cover           : String
                },
                function(rows) {
                    if (typeof rows !== 'undefined' && rows.length > 0){
                        var albums = [];

                        count = rows.length;
                        console.log('Found '+count+' albums, getting additional data...');
                        rows.forEach(function(item, value){
                            var album           = item.album
                                , artist        = item.artist
                                , year          = item.year
                                , cover         = item.cover;

                            getTracks(album, artist, year, cover, function(completeAlbum){
                                albums.push(completeAlbum);
                                count--;

                                if(count === 0 ){
                                    console.log('Sending data to client');
                                    res.json(albums);
                                }
                            });
                        });
                    } else {
                        console.log('Could not index any tv shows, please check given movie collection path...');
                    }
            });
        }
    });
}

function getTracks(album, artist, year, cover, callback){
    db.query('SELECT * FROM tracks WHERE album =? ', [ album ], {
            title   : String,
            track   : String,
            album   : String,
            artist  : String,
            year    : String
        },
        function(rows) {
            if (typeof rows !== 'undefined' && rows.length > 0){

                var completeAlbum ={
                    "album"     : album,
                    "artist"    : artist,
                    "year"      : year,
                    "cover"     : cover,
                    "tracks"    : rows
                }

                callback(completeAlbum);
            }
        }
    );
}