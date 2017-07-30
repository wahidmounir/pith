"use strict";

var settings = require("../../lib/global")().settings;
var fetch = require('node-fetch');
var parseUrl = require('url').parse;
var Channel = require("../../lib/channel");
var global = require("../../lib/global")();
var parseDate = require("../../lib/util").parseDate;
var fs = require('fs');
var path = require('path');

function parseItemId(itemId) {
    if(itemId) {
        let i = itemId.indexOf('/');
        if(i == -1) throw "Incorrect id";
        return {
            id: itemId.substring(i+1),
            mediatype: itemId.substring(0, i)
        };
    } else {
        return {
            id: 'root',
            mediatype: 'root'
        };
    }
}

class CouchPotatoChannel extends Channel {
    constructor(pith, url, apikey) {
        super(pith);
        this.url = parseUrl(url.endsWith("/") ? url : url + "/");
        this.pith = pith;
        this.apikey = apikey;
    }

    _get(url) {
        var u = this.url.resolve(`api/${this.apikey}/${url}`);

        return fetch(u).then(res => res.json()).then(j => {
            if(!j.success) throw "Call failed";
            return j;
        });
    }

    listContents(containerId) {
        return this._get('movie.list').then(result => {
            if(result.empty) {
                return [];
            } else {
                return result.movies.filter(movie => movie.releases.length > 0).map(movie => (this.mapMovie(movie)));
            }
        });
    }

    mapMovie(movie) {
        let release = movie.releases.find(r => r.status == 'done');
        let movieFile = release && release.files.movie && release.files.movie[0];
        let stat = movieFile && fs.statSync(path.dirname(movieFile));
        return {
            id: 'media/' + movie._id,
            title: movie.title,
            type: 'file',
            playable: release && true,
            year: movie.info.year,
            rating: movie.info.rating && movie.info.rating.imdb[0],
            plot: movie.info.plot,
            tagline: movie.info.tagline,
            genres: movie.info.genres,
            imdbId: movie.identifiers.imdb,
            poster: movie.info.images.poster[0],
            backdrop: movie.info.images.backdrop[0],
            // releaseDate: movie.info.released,
            runtime: movie.info.runtime,
            actors: movie.info.actors,
            writers: movie.info.writers,
            filePath: release && release.files.movie[0],
            hasNew: movie.tags && movie.tags.indexOf("recent") > -1,
            creationTime: stat && stat.mtime
        };
    }

    queryMedia(id) {
        return this._get(`media.get?id=${id}`).then(result => (this.mapMovie(result.media)));
    }

    getItem(itemId, detailed) {
        let parsed = parseItemId(itemId);
        switch(parsed.mediatype) {
            case 'media':
                return this.queryMedia(parsed.id);
        }
        return Promise.resolve({
            sortableFields: ['title', 'year', 'rating', 'runtime', 'creationTime'],
            id: itemId
        });
    }

    getFile(item) {
        let filesChannel = this.pith.getChannelInstance('files');
        return filesChannel.resolveFile(item.filePath);
    }

    getStream(item) {
        let filesChannel = this.pith.getChannelInstance('files');
        return this.getFile(item).then(file => {
            return filesChannel.getStream(file)
        });
    }

    getLastPlayState(itemId) {
        let parsed = parseItemId(itemId);
        if(parsed.type == 'media') {
            return this.getItem(itemId).then(item => this.getLastPlayStateFromItem(item));
        } else {
            return Promise.resolve();
        }
    }

    getLastPlayStateFromItem(item) {
        if(item.type == 'file' && item.playable) {
            if(item.unavailable) {
                return Promise.resolve();
            } else {
                let filesChannel = this.pith.getChannelInstance('files');
                return this.getFile(item).then(file => filesChannel.getLastPlayStateFromItem(file));
            }
        } else {
            return Promise.resolve();
        }
    }

    putPlayState(itemId, state) {
        let filesChannel = this.pith.getChannelInstance('files');
        return this.getItem(itemId).then(item => this.getFile(item)).then(file => filesChannel.putPlayState(file.id, state));
    }
}

module.exports = {
    init(opts) {
        if(settings.couchpotato && settings.couchpotato.enabled && settings.couchpotato.url) {
            opts.pith.registerChannel({
                id: 'couchpotato',
                title: 'CouchPotato',
                type: 'channel',
                init(opts) {
                    return new CouchPotatoChannel(opts.pith, settings.couchpotato.url, settings.couchpotato.apikey);
                }
            })
        };
    }
};
