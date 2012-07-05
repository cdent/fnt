/*
 * fnt - f* networked tiddlers
 *
 * Simple tiddler objects for getting, putting and deleting.
 *
 * The goal here is simple programmatic access to tiddlers hosted
 * by TiddlyWeb.
 *
 * Events are used to notify of success or failure, not
 * callbacks.
 *
 * The Tiddler object is in the tiddlyweb namespace, with the expected
 * attributes and three method: uri(), toJSON(), fromJSON(). The
 * object is not smart about itself, except when it comes to dates.
 * And that might go away if it doesn't matter.
 *
 * The HTTP methods are on the tiddlyweb namespace itself: {put, get,
 * delete}Tiddler().
 *
 * jQuery is used to drive the underlying AJAX and Event handling. See
 * index.html for sample use.
 *
 * The code is verbose, boiler-platey and vertically over exuberant
 * on purpose.
 *
 */

var tiddlyweb = tiddlyweb || {};

/* Establish explicit tiddler structure with a bunch of undefined fields.
 *
 * Noisy, but meaningful.
 */
tiddlyweb.Tiddler = function(title) {
    this.title = title;

    this.host = undefined;
    this.bag = undefined;
    this.recipe = undefined;

    this.modifier = undefined;
    this.modfied = undefined;

    this.creator = undefined;
    this.created = undefined;

    this.text = undefined;
    this.render = undefined;

    this.type = undefined;
    this.revision = undefined;

    this.tags = [];
    this.fields = {};
}

/* Calculate the uri for this tiddler.
 * 
 * If bag is set, use that. If not bag, try recipe.
 * If no recipe, fire an error event.
 *
 * If no host is provided, fire an error event.
 */
tiddlyweb.Tiddler.prototype.uri = function() {

    if (!this.host) {
        $(document).trigger('error', {
            tiddler: this,
            method: 'uri',
            msg: 'host required'});
        return;
    }

    var container = '';
    if (!this.bag) {
        if (this.recipe) {
            container = 'recipes/' + encodeURIComponent(this.recipe);
        } else {
            $(document).trigger('error', {
                tiddler: this,
                method: 'uri',
                msg: 'no container data provided, bag or recipe required'});
            return;
        }
    } else {
        container = 'bags/' + encodeURIComponent(this.bag);
    }

    return this.host + '/' + container + '/tiddlers/' +
        encodeURIComponent(this.title);
}
            

/* Transform this tiddler to JSON.
 *
 * We only take those fields which will be sent to the server.
 *
 * 'modifier' etc are set by the server.
 */
tiddlyweb.Tiddler.prototype.toJSON = function() {
    var tiddlerDict = {
        title: this.title,
        text: this.text,
        tags: this.tags,
        type: this.type,
        fields: this.fields
    };
    return JSON.stringify(tiddlerDict);
}

/* Adjust from-JSON object to have DateS, not string timestamps.
 *
 * jQuery has already turn the sent-from-server JSON into an
 * object.
 */
tiddlyweb.Tiddler.prototype.fromJSON = function(tiddlerDict) {
    this.text = tiddlerDict.text;
    this.render = tiddlerDict.render;
    this.tags = tiddlerDict.tags;
    this.type = tiddlerDict.type;
    this.fields = tiddlerDict.fields;
    this.modifier = tiddlerDict.modifier;
    this.modified = tiddlyweb.timestampToDate(tiddlerDict.modified);
    this.creator = tiddlerDict.creator;
    this.created = tiddlyweb.timestampToDate(tiddlerDict.created);
    this.revision = tiddlerDict.revision;
};

/* Turn a TiddlyWiki timestamp into a Date.
 */
tiddlyweb.timestampToDate = function(date) {
    return new Date(Date.UTC(
        parseInt(date.substr(0, 4), 10),
        parseInt(date.substr(4, 2), 10) - 1,
        parseInt(date.substr(6, 2), 10),
        parseInt(date.substr(8, 2), 10),
        parseInt(date.substr(10, 2), 10),
        parseInt(date.substr(12, 2) || "0", 10),
        parseInt(date.substr(14, 3) || "0", 10)));
};

/* GET request a tiddler from its server.
 *
 * Fire 'tiddlerGet' on success.
 * 'error' on failure.
 */
tiddlyweb.getTiddler = function(tiddler) {
    var uri = tiddler.uri();
    if (uri) {
        $.ajax({
            url: uri,
            dataType: 'json',
            success: function(data) {
                tiddler.fromJSON(data);
                console.log('got', tiddler);
                $(document).trigger('tiddlerGet', tiddler);
            },
            error: function(xhr, status, message) {
                $(document).trigger('error', {
                    tiddler: tiddler,
                    method: 'get',
                    'status': status,
                    msg: message + '\n' + xhr.responseText});
            }
        });
    }
};

/* PUT a tiddler to its server.
 *
 * Fire 'tiddlerPut' on success.
 * 'error' on failure.
 *
 * XXX: Ignoring ETags for now!!!
 */
tiddlyweb.putTiddler = function(tiddler) {
    var uri = tiddler.uri();
    if (uri) {
        $.ajax({
            url: uri,
            type: 'PUT',
            data: tiddler.toJSON(),
            processData: false,
            contentType: 'application/json',
            success: function() {
                $(document).trigger('tiddlerPut', tiddler);
            },
            error: function(xhr, status, message) {
                $(document).trigger('error', {
                    tiddler: tiddler,
                    method: 'put',
                    'status': status,
                    msg: message + '\n' + xhr.responseText});
            }
        });
    }
};


/* DELETE a tiddler from its server.
 *
 * Fire 'tiddlerDelete' on success.
 * 'error' on failure.
 *
 * XXX: Ignoring ETags for now!!!
 */
tiddlyweb.deleteTiddler = function(tiddler) {
    var uri = tiddler.uri();
    if (uri) {
        $.ajax({
            url: uri,
            type: 'DELETE',
            success: function() {
                $(document).trigger('tiddlerDelete', tiddler);
            },
            error: function(xhr, status, message) {
                $(document).trigger('error', {
                    tiddler: tiddler,
                    method: 'put',
                    'status': status,
                    msg: message + '\n' + xhr.responseText});
            }
        });
    }
};
