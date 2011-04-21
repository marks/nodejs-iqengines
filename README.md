# IQ Engines NodeJS API Bindings #

### Dependencies ###

- **[NodeJS][1] version 0.4.0 or greater**
- **[npm][2] (optional for easier installation)**

### Install ###

You can install the module by using npm and running the command below.

    npm install iqengines

Or, you can also use this module by including it directly inside your project directory.


# Api Reference #

<br>
### new Api(key, secret) ###

A constructor that returns a handle to the iqengines API. `key` and `secret` is your API key/secret obtained from signing up for an account at [http://developer.iqengines.com/][3]. If these are left undefined, the module will look up their values from the `IQE_KEY` and `IQE_SECRET`;

<br>
<br>
### Api.sendQuery(options, [callback])###

Sends an image query to the iqengines servers. Returns a `qid` representing the unique identifier for the given query. *callback* is a function taking a single argument `response`. It is called when you've successfully sent a query to the iqengiens server.

**Options:**

- img - The file path to your image (jpg, png) (required)
- multiple_results - If true then all identified images are returned in the results (default = null)
- device_id - A unique string used to filter out the results when retrieving results using the waitResult method (default = null)
- webhook - The URL where the results are sent via HTTP POST once the results have been computed (default = null)
- extra - A string that is posted back when the webhook is called or when retreiving results. It is useful for passing JSON-encoded extra parameters about the query that your application can then use once the results are available (default = null)
- json - If true, then the response sent to the callback is formatted as a JSON object (default = true)
    

<br>
<br>
### Api.getResult(options, callback) ###

Retrieves the result for a given query. *callback* is a function taking a single argument representing the response from the IQ Engines server. It is called when IQ Engines responds to the getResult request. *response* here will either contain the results of the query if it has been processed or a message specifying that query has not been processed yet.

- qid - The unique identifier returned from the *sendQuery* method (default = true)
- json - If true, then the response sent to the callback is formatted as a JSON object (default = true)



<br>
<br>
### Api.waitResults(options, callback) ###

Opens a long polling connection to the IQ Engines servers and waits until results are ready. *callback* is a function taking a single argument representing the response from the IQ Engines server. It is called when results are ready. 

- device_id - if given, the waitResult call will only return when results are ready from queries sent with the corresponding device\_id (default = null)
- json - If true, then the response sent to the callback is formatted as a JSON object (default = true)

[1]: http://nodejs.org/
[2]: http://npmjs.org/
[3]: http://developer.iqengines.com/