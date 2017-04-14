chrome.runtime.onMessage.addListener(function (request, sender, callback) {
    console.log(request);
    if (request.task == 'start') {
        connect(function() {
            callback();
        });

    }
    if (request.task == 'getSavedSearch') {
        LinkedinSales.fetchSavedSearches(callback);
    }
    if (request.task == 'split') {
        LinkedinSales.splitUrlForSales(request.url, callback);
    }
    if (request.task == 'splitNew') {
        LinkedinSales.splitUrlForSalesNew(request.url, callback);
    }
    return true;
});
var eventDispatcher = null;
var connect = function(callback) {
    eventDispatcher = chrome.runtime.connect({
        name: 'connect'
    });
    if (typeof callback === 'function') {
        callback();
    }
};
connect();
var Log = {
    l: function (tag, msg){
    },
};

var MyRequestsCompleted = (function() {
    var numRequestToComplete, 
        requestsCompleted, 
        callBacks, 
        singleCallBack;

    return function(options) {
        if (!options) options = {};

        numRequestToComplete = options.numRequest || 0;
        requestsCompleted = options.requestsCompleted || 0;
        callBacks = [];
        var fireCallbacks = function (response) {
            for (var i = 0; i < callBacks.length; i++) {
                console.log("Start CallBack function..........." + i);
                callBacks[i].callback(callBacks[i].arg);
            }
            callBacks = [];
        };
        if (options.singleCallback) callBacks.push(options.singleCallback);
        this.incNumRequestToComplete = function(num) {
            numRequestToComplete = numRequestToComplete + num;
        }
        this.decNumRequestToComplete = function(num) {
            numRequestToComplete = numRequestToComplete - num;
        }
        this.removeCallbackFromQueue = function() {
            callBacks.shift();
            console.log("<------------ " + callBacks.length);
        }
        this.addCallbackToQueue = function(isComplete, response, callback) {
            if (isComplete) requestsCompleted++;
            if (callback) callBacks.push({callback: callback, arg: response});
            if (requestsCompleted == numRequestToComplete) fireCallbacks();
        };
        this.requestComplete = function(isComplete) {
            if (isComplete) requestsCompleted++;
            if (requestsCompleted == numRequestToComplete) fireCallbacks();
        };
        this.setCallback = function(callback) {
            callBacks.push(callBack);
        };
    };
})();

var LinkedinSales = {
    getParameterByName: function(pattern, url) {
        var regex = new RegExp(pattern + "=([^&]*)", "g");
        return url.match(regex).map(function(e) {
            return e.replace(pattern + "=", "");
        });
    },

    removeParameterByName: function(pattern, url) {
        var regex = new RegExp("&" + pattern + "=([^&]*)", "g");
        return url.replace(regex, "");
    },
    
    getFacetsCriteriaName: function(info, onlySelected) {
        var sl = [];
        for (var i in info.facets) {
            if (info.facets[i].facetName !== 'Keywords') {
                var sfn = [];
                var hasValue = false;
                if (info.facets[i].facetName == 'Title'){
                    var fn = {
                        titleScope: info.facets[i].timeScope
                    };
                } else if (info.facets[i].facetName == 'Postal code'){
                    if(info.facets[i].postalCodes){
                        hasValue = true;
                        var fn = {
                            countryCode: info.facets[i].countryCode,
                            radiusMiles: info.facets[i].radiusMiles,
                            postalCode: info.facets[i].postalCodes[0]
                        };   
                    }
                } else {
                    var fn = {
                        facet: info.facets[i].shortName
                    };
                }
                
                sfn.push(fn);
                for (var j in info.facets[i].facetValues) {
                    if (onlySelected === true){
                      if (info.facets[i].facetValues[j].selected) {
                        hasValue = true;
                        if (info.facets[i].facetName == 'Title'){
                            sfn.push({
                                jobTitleEntities: info.facets[i].facetValues[j].label + '_' + info.facets[i].facetValues[j].value
                            });
                        } else {
                            sfn.push({
                                facet: info.facets[i].facetName,
                                label: info.facets[i].facetValues[j].label,
                                count: info.facets[i].facetValues[j].count,
                                shortName: info.facets[i].shortName,
                                value: info.facets[i].facetValues[j].value
                            });
                        }
                      }   
                    } else {
                        hasValue = true;
                        if (info.facets[i].facetName == 'Title') {
                            sfn.push({
                                jobTitleEntities: info.facets[i].facetValues[j].label + '_' + info.facets[i].facetValues[j].value
                            });
                        } else {
                            sfn.push({
                                facet: info.facets[i].facetName,
                                label: info.facets[i].facetValues[j].label,
                                count: info.facets[i].facetValues[j].count,
                                shortName: info.facets[i].shortName,
                                value: info.facets[i].facetValues[j].value
                            });
                        }
                    }
                }
                if (hasValue) {
                    sl.push(sfn);
                }
            } else {
                if (info.facets[i].facetValues.length > 0)
                    sl.push({
                        keywords: info.facets[i].facetValues[0].value
                    });
            }
        }
        return sl;
    },

    getFacetsCriteria: function(info) {
        var sl = [];
        for (var i in info.facets) {
            if (info.facets[i].facetName !== 'Keywords') {
                var sfn = [];
                var hasValue = false;
                if (info.facets[i].facetName == 'Title'){
                    var fn = 'titleScope=' + info.facets[i].timeScope;
                } else if (info.facets[i].facetName == 'Postal code'){
                    if(info.facets[i].postalCodes){
                        hasValue = true;
                        var fn = 'countryCode=' + info.facets[i].countryCode + '&radiusMiles=' + info.facets[i].radiusMiles + '&postalCode=' + info.facets[i].postalCodes[0];   
                    }
                } else {
                    var fn = 'facet=' + info.facets[i].shortName;
                }
                
                sfn.push(fn);
                for (var j in info.facets[i].facetValues) {
                    if (info.facets[i].facetValues[j].selected) {
                        hasValue = true;
                        if (info.facets[i].facetName == 'Title'){
                            sfn.push('jobTitleEntities' + '=' + info.facets[i].facetValues[j].label + '_' + info.facets[i].facetValues[j].value);
                        } else {
                            sfn.push('facet.' + info.facets[i].shortName + '=' + info.facets[i].facetValues[j].value);
                        }
                    }
                }
                if (hasValue) {
                    sl.push(sfn.join("&"));
                }
            } else {
                if (info.facets[i].facetValues.length > 0)
                    sl.push('keywords=' + info.facets[i].facetValues[0].value);
            }
        }
        return sl.join("&");
    },
    getTotalCountOfUrlForSales: function(url, callback) {
        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            success: function(res) {
                callback(parseInt(res['pagination']['total']));
            },
            error: function() {
                callback(-1);
            }
        });
    },

    getArrBiggerThan999: function(arr) {
        var sum1 = 0;
        var sub = [];
        var arr2 = [];
        for (var i = 0; i < arr.length; i++) {
         if (arr[i].count > 999) {
            if (sub.length > 0) {
                arr2.push(sub);
                sub = [];
                sum1 = 0;
            }
          arr2.push([arr[i]]);
         } else {
           sum1 += arr[i].count;
           if (sum1 <= 999)
            sub.push(arr[i]);
           else {
            arr2.push(sub);
            sub = [];
            sum1 = 0;
            i = i - 1;
           }
         }
        }
        if (sub.length > 0) {
            arr2.push(sub);
        }
        return arr2;
    },

    getSplitURL:  function(url, callback) {
        $.get(url).done(function(fc) {
            requestCallback.addCallbackToQueue(true, function(fc) {
                console.log(fc);
            });
        });
    },

    getFilterHasCount: function(containedFilterStr) {
        var details = containedFilterStr;
        var detail_html = "";
        var containedFilterUrls = [];
        for(j in details) {
            var sub_detail = details[j];
            for(k in sub_detail) {
                if (typeof sub_detail[k].count !== 'undefined' && sub_detail[k].count !== null) {
                    var subCount = sub_detail[k].count;
                    var shortName = sub_detail[k].shortName;
                    var value = sub_detail[k].value;
                    containedFilterUrls.push({
                        shortName: shortName, 
                        count: subCount,
                        value: value
                    });
                }
            }
        }
        return containedFilterUrls;
    },

    getUrlByShortName: function(shortName, urls) {
        var firstArr = [];
        for (i in urls) {
            if (shortName === urls[i].shortName) {
                firstArr.push(urls[i]);
            }
        }
        return firstArr;
    },

    getFacetUrlByShortName: function(shortName, urls) {
        var str = "";
        for (var k in urls) {
            str += "&facet." + shortName + "=" + urls[k].value;
        }
        return str;
    },

    splitUrlForSalesNew: function(url, callback) {
        var g_data = [];
        var g_bigThan999Urls = [];

        url = url.replace(/%2C/g, ",");
        url = url.replace(/%3A/g, ":");
        var facets_pepole_url = url.replace("sales/search", "sales/search/facets/people");        

        var requestCallback = new MyRequestsCompleted({
            numRequest: 0
        });

        var loop = function(urls) {
            var getSplitURL = function(url, callback) {
                console.log(url);
                $.get(url).done(function(fc) {
                    requestCallback.addCallbackToQueue(true, fc, function() {
                        containedFilterStr = LinkedinSales.getFacetsCriteriaName(fc, true);
                        var containedFilterUrls = LinkedinSales.getFilterHasCount(containedFilterStr);
                        console.log("count of containedFilterUrls" + containedFilterUrls.length);
                        // get url bigger than 999
                        var globalShortName = '';
                        for (i in containedFilterStr) {
                            if (containedFilterStr[i].length > 2 && typeof containedFilterStr[i][0].facet !== 'undefined') {
                                globalShortName = containedFilterStr[i][0].facet;
                                console.log("---------------"+ globalShortName);
                                break;
                            }
                        }
                        var bigThan999Urls = [];
                        var smallThan999Urls = [];

                        if (globalShortName === '') {
                            var containedFilterUrls1 = LinkedinSales.getFilterHasCount(LinkedinSales.getFacetsCriteriaName(fc, false));
                            var str = ""; 
                            if (url.indexOf('facet.I') !== -1) {
                                if (url.indexOf('facet.SE') !== -1) {
                                    if (url.indexOf('facet.FA') !== -1) {

                                    } else {
                                    str = LinkedinSales.getFacetUrlByShortName('FA', LinkedinSales.getUrlByShortName('FA', containedFilterUrls1));
                                    var industryUrl = url + "&facet=FA" + str;
                                    bigThan999Urls.push(industryUrl);
                                }
                                } else {
                                    str = LinkedinSales.getFacetUrlByShortName('SE', LinkedinSales.getUrlByShortName('SE', containedFilterUrls1));
                                    var industryUrl = url + "&facet=SE" + str;
                                    bigThan999Urls.push(industryUrl);
                                }
                            } else {
                            // it assumes that we have to use industry filter
                                var industry_key = ["47,94,120,125,127,19,50,111,53,52,41,12,36,49,138,129,54,90,51,128,118,109,3,5,4,48,24,25,91,18,65,1,99,69,132,112,28,86,110,76,122,63,43,38,66,34,23,101,26,29,145,75,148,140,124,68,14,31,137,134,88,147,84,96,42,74,141,6,7,8,9,10,11,13,15,16,17,20,21,22,27,30,32,33,35,37,39,40,44,45,46,55,56,57,58,59,60,61,62,64,67,70,71,72,73,77,78,79,80,81,82,83,85,87,89,92,93,95,97,98,100,102,103,104,105,106,107,108,113,114,115,116,117,119,121,123,126,130,131,133,135,136,139,142,143,144,146"];
                                var cur_url_industry = [];
                                for (var j in industry_key) {
                                    var str = "";
                                    var temp_industry = industry_key[j].split(",");
                                    for (var l in temp_industry) {
                                        str += "&facet.I=" + temp_industry[l];
                                    }
                                    var industryUrl = url + "&facet=I" + str;
                                    bigThan999Urls.push(industryUrl);
                                }
                            }
                        } else {
                            var firstArr = [];
                            firstArr = LinkedinSales.getUrlByShortName(globalShortName, containedFilterUrls);

                            var _ArrBiggerThan999 = LinkedinSales.getArrBiggerThan999(firstArr);

                            for (i in _ArrBiggerThan999) {
                                var containedFilterUrl = _ArrBiggerThan999[i];
                                var sumShortName = "";
                                var sumCount = 0;
                                var shortName = containedFilterUrl[0].shortName;
                                for(j in containedFilterUrl) {
                                    if (containedFilterUrl[j].count > 999) {
                                        // big url
                                        var containedFilterURL = LinkedinSales.removeParameterByName('facet.'+ containedFilterUrl[j].shortName, url) 
                                        + "&facet=" + containedFilterUrl[j].shortName + "&facet." + containedFilterUrl[j].shortName + "=" + decodeURIComponent(containedFilterUrl[j].value);
                                        bigThan999Urls.push(containedFilterURL);
                                        eventDispatcher.postMessage({
                                            type: "BTU",
                                            count: containedFilterUrl[j].count,
                                            shortName: containedFilterUrl[j].shortName,
                                            value: containedFilterUrl[j].value
                                        });
                                    } else if (containedFilterUrl[j].count > 0 && containedFilterUrl[j].count <= 999) {
                                        // small url
                                        
                                        if (shortName === null)
                                            shortName = globalShortName;
                                        sumCount = sumCount + containedFilterUrl[j].count;
                                        sumShortName = sumShortName + '&facet.' + containedFilterUrl[j].shortName + '=' + containedFilterUrl[j].value;

                                    }
                                }
                                if (sumShortName.indexOf('&facet.') !== -1) {
                                    var containedFilterURL = LinkedinSales.removeParameterByName('facet.'+ shortName, url) + "&facet=" + shortName + sumShortName;
                                    smallThan999Urls.push(containedFilterURL);
                                    eventDispatcher.postMessage({
                                        type: "STU",
                                        count: sumCount,
                                        shortName: sumShortName
                                    });

                                }
                            }
                        }
                        callback(bigThan999Urls);
                    });
                });
            };
            for (i = 0; i < urls.length; i++) {
                requestCallback.incNumRequestToComplete(1);
                getSplitURL(urls[i], function(bigUrls) {
                    //requestCallback.removeCallbackFromQueue();
                    console.log(bigUrls);
                    if (bigUrls.length > 0)
                        loop(bigUrls);

                });
            }
            //g_bigThan999Urls = [];
        };
        loop([facets_pepole_url]);
    },

    splitUrlForSalesOld: function(url, callback) {

        var containedFilterStr = '';
        var globalbigThan999Urls = [];
        var loop = function (url) {
            var containedFilterUrls = [];
        // 1. check contained filter
            url = url.replace(/%2C/g, ",");
            url = url.replace(/%3A/g, ":");
            var sales_search_facets_pepole_url = url.replace("sales/search", "sales/search/facets/people");
            $.get(sales_search_facets_pepole_url).done(function(fc) {
                containedFilterStr = LinkedinSales.getFacetsCriteriaName(fc);
                eventDispatcher.postMessage({
                    type: "CF",
                    containedFilterArr: containedFilterStr
                });
                var details = containedFilterStr;
                var detail_html = "";
                for(j in details) {
                    var sub_detail = details[j];
                    for(k in sub_detail) {
                        if (typeof sub_detail[k].count !== 'undefined' && sub_detail[k].count !== null) {
                            var subCount = sub_detail[k].count;
                            var shortName = sub_detail[k].shortName;
                            var value = sub_detail[k].value;
                            //var containedFilterURL = LinkedinSales.removeParameterByName('facet.'+ shortName, url) + "&facet=" + shortName + "&facet." + shortName + "=" + decodeURIComponent(sub_detail[5]);
                            containedFilterUrls.push({
                                shortName: shortName, 
                                count: subCount,
                                value: value
                            });
                        }
                    }
                }
                // get url bigger than 999
                var globalShortName = containedFilterUrls[0].shortName;
                var firstArr = [];
                for (i in containedFilterUrls) {
                    if (globalShortName === containedFilterUrls[i].shortName) {
                        firstArr.push(containedFilterUrls[i]);
                    }
                }

                var _ArrBiggerThan999 = LinkedinSales.getArrBiggerThan999(firstArr);
                eventDispatcher.postMessage({
                    type: "CFU",
                    containedFilterUrl: _ArrBiggerThan999
                });

                var bigThan999Urls = [];
                var smallThan999Urls = [];
                for (i in _ArrBiggerThan999) {
                    var containedFilterUrl = _ArrBiggerThan999[i];
                    for(j in containedFilterUrl) {
                        if (containedFilterUrl[j].count > 999) {
                            // big url
                            var containedFilterURL = LinkedinSales.removeParameterByName('facet.'+ containedFilterUrl[j].shortName, url) 
                            + "&facet=" + containedFilterUrl[j].shortName + "&facet." + containedFilterUrl[j].shortName + "=" + decodeURIComponent(containedFilterUrl[j].value);
                            bigThan999Urls.push(containedFilterURL);
                        } else {
                            // small url
                            var shortName = containedFilterUrl[j][0];
                            var sumShortName = "";
                            if (shortName === null)
                                shortName = globalShortName;
                            for (k in containedFilterUrl[j]) {
                                var sumCount = containedFilterUrl[j][k].count;
                                sumShortName += sumShortName + '&facet.' + containedFilterUrl[j][k].shortName + '=' + containedFilterUrl[j][k].value;
                            }
                            var containedFilterURL = LinkedinSales.removeParameterByName('facet.'+ shortName, url) + "&facet=" + shortName + sumShortName;
                            smallThan999Urls.push(containedFilterURL);
                            eventDispatcher.postMessage({
                                type: "STU",
                                containedFilterUrl: smallThan999Urls
                            });
                        }
                    }
                }
                globalbigThan999Urls.push(bigThan999Urls);
                loop(bigThan999Urls[0]);
            });
        }
        loop(url);
        callback(containedFilterUrls);

    },

    splitUrlForSales: function(url, callback) {
        var urlArray = new Array;
        var maxVar = 999;
        var arrayResults = [];
        var industryResults = [];
        var seniorityResults = [];
        var seniorityBigArray = [];
        var industryBigArray = [];
        var companyResults = [];
        var companyBigArray = [];
        var groupResults = [];
        var groupBigArray = [];
        var locationResults = [];
        var locationBigArray = [];
        var relationResults = [];
        var relationBigArray = [];
        var languageResults = [];
        var languageBigArray = [];
        url = url.replace(/%2C/g, ",");
        url = url.replace(/%3A/g, ":");
        var cur_url = url.replace("sales/search", "sales/search/results");
        var totalProfilesFound = 0;
        var getURLby = function(dataArray, keyURL, keyWord, totalCount) { //industryArray,industryURL,"face.I",total
            // the array
            var resultArrS = new Array;
            var countArrS = new Array;
            var bigArrS = new Array;
            var startIndexS = 0;
            var currentIndexS = 0;
            var tempSumS = 0;
            for (var iS = startIndexS; iS < dataArray.length; iS++) {
                if (dataArray[iS].selected === false) continue;
                var sumS = parseInt(dataArray[iS].count);
                if (sumS > maxVar) {
                    bigArrS.push(dataArray[iS].value);
                    currentIndexS++;
                    tempSumS = 0;
                } else {
                    tempSumS += sumS;
                    if (tempSumS > maxVar) {
                        tempSumS = sumS;
                        currentIndexS++;
                        if (typeof(resultArrS[currentIndexS]) == "undefined") {
                            resultArrS[currentIndexS] = "";
                            countArrS[currentIndexS] = 0;
                        }
                        resultArrS[currentIndexS] = dataArray[iS].value;
                        countArrS[currentIndexS] = dataArray[iS].count;
                    } else {
                        if (typeof(resultArrS[currentIndexS]) == "undefined") {
                            resultArrS[currentIndexS] = "";
                            countArrS[currentIndexS] = 0;
                        }
                        resultArrS[currentIndexS] = resultArrS[currentIndexS] + (resultArrS[currentIndexS] ? "," : "") + dataArray[iS].value;
                        countArrS[currentIndexS] = countArrS[currentIndexS] + dataArray[iS].count;
                    }
                }
            }

            var urlArrayTest = new Array;
            var tmp_url = "";
            for (var iS in resultArrS) {
                var tmp_url = resultArrS[iS].split(",");
                var tmp_str = "";
                for (var l in tmp_url) {
                    tmp_str += "&" + keyWord + "=" + tmp_url[l];
                }
                if (parseInt(countArrS[iS]) > 0) {
                    Log.l("Sales Naviagator: ", "Passed segment URL ", keyURL.replace("sales/search/results", "sales/search") + tmp_str);
                    urlArrayTest.push({
                        "url": keyURL.replace("sales/search/results", "sales/search") + tmp_str,
                        "count": countArrS[iS],
                        "totalcount": totalCount
                    });
                }
            }
            for (var i in urlArrayTest) {
                totalProfilesFound += urlArrayTest[i].count;
            }
            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
            if (percentComplete >= 99) {
                percentComplete = 99;
            }
            eventDispatcher.postMessage({
                type: "B",
                resultArrS: resultArrS,
                countArrS: countArrS
            });

            /*
            eventDispatcher.postMessage({
                percent: percentComplete
            });
            */
            return {
                "urlLits": urlArrayTest,
                "results": resultArrS,
                "bigArr": bigArrS
            };
        };
        LinkedinSales.getTotalCountOfUrlForSales(cur_url, function(totalCount) {
            if (totalCount > 999) {
                if (cur_url.indexOf("facet.I=") == -1) {
                    var industry_key = ["47,94,120,125,127,19,50,111,53,52,41,12,36,49,138,129,54,90,51,128,118,109,3,5,4,48,24,25,91,18,65,1,99,69,132,112,28,86,110,76,122,63,43,38,66,34,23,101,26,29,145,75,148,140,124,68,14,31,137,134,88,147,84,96,42,74,141,6,7,8,9,10,11,13,15,16,17,20,21,22,27,30,32,33,35,37,39,40,44,45,46,55,56,57,58,59,60,61,62,64,67,70,71,72,73,77,78,79,80,81,82,83,85,87,89,92,93,95,97,98,100,102,103,104,105,106,107,108,113,114,115,116,117,119,121,123,126,130,131,133,135,136,139,142,143,144,146"];
                    var language_key = ["en,ar,zh,cs,da,nl,fr,de,in,it,ja,ko,ms,no,pl,pt,ro,ru,es,sv,tl,th,tr"];
                    var cur_url_industry = [];
                    for (var j in industry_key) {
                        var str = "";
                        var temp_industry = industry_key[j].split(",");
                        for (var l in temp_industry) {
                            str += "&facet.I=" + temp_industry[l];
                        }
                        cur_url_industry.push(url + "&facet=I" + str);
                    }

                    var getIndustryUrls = function(industryCallback) {
                        var industryAjax = function() {
                            if (cur_url_industry[0]) {
                                var industryURI = cur_url_industry[0].replace("sales/search", "sales/search/facets/people");
                                $.ajax({
                                    url: industryURI,
                                    success: function(response) {
                                        var industryArrayContainer = response.facets;
                                        var industryArray;
                                        for (var i in industryArrayContainer) {
                                            if (industryArrayContainer[i].facetName == "Industry") {
                                                industryArray = industryArrayContainer[i].facetValues;
                                                break;
                                            }
                                        }

                                        eventDispatcher.postMessage({
                                            type: "A",
                                            indArr: industryArray
                                        });

                                        var industryURL = cur_url.replace("sales/search/results", "sales/search") + "&facet=I";
                                        var urlResultData = getURLby(industryArray, industryURL, "facet.I", totalCount);
                                        for (var keyI in urlResultData.urlLits) {
                                            industryResults.push(urlResultData.urlLits[keyI]);
                                        }
                                        for (var key in urlResultData.bigArr) {
                                            industryBigArray.push(urlResultData.bigArr[key]);
                                        }
                                        Log.l("Sales Naviagator: ", "industryBigArray ", industryBigArray);
                                        cur_url_industry.shift();
                                        industryAjax();
                                    },
                                    error: function(error) {
                                        industryAjax();
                                    }
                                });
                            } else {
                                industryCallback(industryResults, industryBigArray);
                            }
                        }
                        industryAjax();
                    }
                    getIndustryUrls(function(industryResults, industryBigArray) {
                        if (industryBigArray.length > 0) {
                            if (cur_url.indexOf("facet.G=") == -1 || LinkedinSales.getParameterByName('facet.G', cur_url).length > 1) {
                                var getLocationUrls1 = function(locationCallback) {
                                    var doAjax = function() {
                                        if (industryBigArray[0]) {
                                            var ajaxURI = cur_url.replace("sales/search/results", "sales/search/facets/people") + "&facet=I&facet.I=" + industryBigArray[0];

                                            var locationURL = LinkedinSales.removeParameterByName('facet.G', LinkedinSales.removeParameterByName('facet=G', cur_url))
                                            .replace("sales/search/results", "sales/search") + "&facet=I&facet.I=" + industryBigArray[0] + "&facet=G";
                                            $.ajax({
                                                url: ajaxURI,
                                                success: function(response) {
                                                    var locationArrayContainer = response.facets;
                                                    var locationArray;
                                                    for (var i in locationArrayContainer) {
                                                        if (locationArrayContainer[i].facetName == "Location") {
                                                            locationArray = locationArrayContainer[i].facetValues;
                                                            break;
                                                        }
                                                    }
                                                    eventDispatcher.postMessage({
                                                        type: "C",
                                                        locArr: locationArray
                                                    });

                                                    var urlResultData = getURLby(locationArray, locationURL, "facet.G", totalCount);
                                                    for (var keyG in urlResultData.urlLits) {
                                                        if (urlResultData.urlLits[keyG]['count']) {
                                                            locationResults.push(urlResultData.urlLits[keyG]);
                                                        }
                                                    }
                                                    for (var key in urlResultData.bigArr) {
                                                        locationBigArray.push(locationURL.replace("sales/search", "sales/search/facets/people") + "&facet.G=" + urlResultData.bigArr[key]);
                                                    }
                                                    industryBigArray.shift();
                                                    doAjax();
                                                },
                                                error: function(error) {
                                                    doAjax();
                                                }
                                            });
                                        } else {
                                            locationCallback(locationResults, locationBigArray);
                                        }
                                    }
                                    doAjax();
                                }
                                var getCompanyUrls = function(companyCallback) {
                                    var doAjax = function() {
                                        if (locationBigArray[0]) {
                                            var componysizeURL = locationBigArray[0].replace("sales/search/facets/people", "sales/search") + "&facet=CS";
                                            $.ajax({
                                                url: locationBigArray[0],
                                                success: function(response) {
                                                    var componysizeArrayContainer = response.facets;
                                                    var componysizeArray;
                                                    for (var i in componysizeArrayContainer) {
                                                        if (componysizeArrayContainer[i].facetName == "Company size") {
                                                            componysizeArray = componysizeArrayContainer[i].facetValues;
                                                            break;
                                                        }
                                                    }
                                                    eventDispatcher.postMessage({
                                                        type: "D",
                                                        comArr: componysizeArray
                                                    });

                                                    var urlResultData = getURLby(componysizeArray, componysizeURL, "facet.CS", totalCount);
                                                    for (var keyCS in urlResultData.urlLits) {
                                                        if (urlResultData.urlLits[keyCS]['count']) companyResults.push(urlResultData.urlLits[keyCS]);
                                                    }
                                                    for (var key in urlResultData.bigArr) {
                                                        companyBigArray.push(componysizeURL.replace("sales/search", "sales/search/facets/people") + "&facet.CS=" + urlResultData.bigArr[key]);
                                                    }
                                                    locationBigArray.shift();
                                                    doAjax();
                                                },
                                                error: function(error) {
                                                    doAjax();
                                                }
                                            });
                                        } else {
                                            companyCallback(companyResults, companyBigArray);
                                        }
                                    }
                                    doAjax();
                                }
                                var getSeniorityUrls = function(seniorityCallback) {
                                    var doAjax = function() {
                                        if (companyBigArray[0]) {
                                            var seniorityURL = companyBigArray[0].replace("sales/search/facets/people", "sales/search") + "&facet=SE";
                                            $.ajax({
                                                url: companyBigArray[0],
                                                success: function(response) {
                                                    var seniorityArrayContainer = response.facets;
                                                    var seniorityArray;
                                                    for (var i in seniorityArrayContainer) {
                                                        if (seniorityArrayContainer[i].facetName == "Seniority level") {
                                                            seniorityArray = seniorityArrayContainer[i].facetValues;
                                                        }
                                                    }
                                                    eventDispatcher.postMessage({
                                                        type: "E",
                                                        senArr: seniorityArray
                                                    });

                                                    var urlResultData = getURLby(seniorityArray, seniorityURL, "facet.SE", totalCount);
                                                    for (var keyCE in urlResultData.urlLits) {
                                                        if (urlResultData.urlLits[keyCE]['count']) seniorityResults.push(urlResultData.urlLits[keyCE]);
                                                    }
                                                    for (var key in urlResultData.bigArr) {
                                                        seniorityBigArray.push(seniorityURL.replace("sales/search?", "sales/search/facets/people?") + "&facet.SE=" + urlResultData.bigArr[key]);
                                                    }
                                                    companyBigArray.shift();
                                                    doAjax();
                                                },
                                                error: function(error) {
                                                    doAjax();
                                                }
                                            });
                                        } else {
                                            seniorityCallback(seniorityResults, seniorityBigArray);
                                        }
                                    }
                                    doAjax();
                                }
                                getLocationUrls1(function(locationResults, locationBigArray) {
                                    if (locationBigArray.length > 0) {
                                        if (cur_url.indexOf('facet.CS') == -1 || LinkedinSales.getParameterByName('facet.CS', cur_url).length > 1) {
                                            getCompanyUrls(function(companyResults, companyBigArray) {
                                                if (companyBigArray.length > 0) {
                                                    getSeniorityUrls(function(seniorityResults, seniorityBigArray) {
                                                        if (seniorityBigArray.length > 0) {
                                                            var getLanguageUrls = function(languageCallback) {
                                                                var doAjax = function() {
                                                                    if (seniorityBigArray[0]) {
                                                                        var languageURL = seniorityBigArray[0].replace("sales/search/results", "sales/search").replace("sales/search/facets/people?", "sales/search?") + "&facet=L";
                                                                        $.ajax({
                                                                            url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?").replace("sales/search/facets/people?", "sales/search/expandFacet?") + "&shortName=L",
                                                                            success: function(response) {
                                                                                var languageArrayContainer = response.result;
                                                                                var languageArray;
                                                                                languageArray = languageArrayContainer.facetValues;
                                                                                var urlResultData = getURLby(languageArray, languageURL, "facet.L", totalCount);
                                                                                for (var keyCE in urlResultData.urlLits) {
                                                                                    if (urlResultData.urlLits[keyCE]['count']) languageResults.push(urlResultData.urlLits[keyCE]);
                                                                                }
                                                                                if (urlResultData.bigArr.length) {
                                                                                    for (var keyBig in urlResultData.bigArr) {
                                                                                        languageResults.push({
                                                                                            "url": languageURL.replace("sales/search/results", "sales/search") + "&facet.L=" + urlResultData.bigArr[keyBig],
                                                                                            "count": 999,
                                                                                            "totalcount": totalCount
                                                                                        });
                                                                                        totalProfilesFound += 999;
                                                                                        var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                        if (percentComplete >= 99) {
                                                                                            percentComplete = 99;
                                                                                        }
                                                                                        eventDispatcher.postMessage({
                                                                                            percent: percentComplete
                                                                                        });
                                                                                    }
                                                                                }
                                                                                seniorityBigArray.shift();
                                                                                doAjax();
                                                                            },
                                                                            error: function(error) {
                                                                                doAjax();
                                                                            }
                                                                        });
                                                                    } else {
                                                                        languageCallback(languageResults, languageBigArray);
                                                                    }
                                                                }
                                                                doAjax();
                                                            }
                                                            var getGroupUrls = function(groupCallback) {
                                                                var doAjax = function() {
                                                                    if (seniorityBigArray[0]) {
                                                                        var groupURL = seniorityBigArray[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                                        $.ajax({
                                                                            url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                            success: function(response) {
                                                                                var groupArrayContainer = response.result;
                                                                                var groupArray;
                                                                                groupArray = groupArrayContainer.facetValues;
                                                                                var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                                for (var keyAG in urlResultData.urlLits) {
                                                                                    if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                                }
                                                                                if (urlResultData.bigArr.length) {
                                                                                    for (var keyBig in urlResultData.bigArr) {
                                                                                        groupResults.push({
                                                                                            "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                            "count": 999,
                                                                                            "totalcount": totalCount
                                                                                        });
                                                                                        totalProfilesFound += 999;
                                                                                        var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                        if (percentComplete >= 99) {
                                                                                            percentComplete = 99;
                                                                                        }
                                                                                        eventDispatcher.postMessage({
                                                                                            percent: percentComplete
                                                                                        });
                                                                                    }
                                                                                }
                                                                                seniorityBigArray.shift();
                                                                                doAjax();
                                                                            },
                                                                            error: function(error) {
                                                                                doAjax();
                                                                            }
                                                                        });
                                                                    } else {
                                                                        groupCallback(groupResults, groupBigArray);
                                                                    }
                                                                }
                                                                doAjax();
                                                            }
                                                            if (cur_url.indexOf('facet.L') == -1) {
                                                                getLanguageUrls(function(languageResults, languageBigArray) {
                                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, languageResults);
                                                                    if (arrayResults[0]) {
                                                                        for (var loop in arrayResults) {
                                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                                        }
                                                                        callback(arrayResults);
                                                                    } else {
                                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                                        callback([{
                                                                            'url': cur_url,
                                                                            count: -1
                                                                        }]);
                                                                    }
                                                                });
                                                            }else if (LinkedinSales.getParameterByName('facet.L', cur_url).length == 1) {
                                                                getGroupUrls(function(groupResults, groupBigArray) {
                                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                                    if (arrayResults[0]) {
                                                                        for (var loop in arrayResults) {
                                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                                        }
                                                                        callback(arrayResults);
                                                                    } else {
                                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                                        callback([{
                                                                            'url': cur_url,
                                                                            count: -1
                                                                        }]);
                                                                    }
                                                                });
                                                            }else {
                                                                var overfL = LinkedinSales.getParameterByName('facet.L', cur_url);
                                                                var overfLurl = [];
                                                                for (var SE in seniorityBigArray) {
                                                                    for (var ol in overfL){
                                                                        overfLurl.push(LinkedinSales.removeParameterByName('facet.L', seniorityBigArray[SE]) + "&facet.L=" + overfL[ol]);
                                                                    }
                                                                };
                                                                var getNewGroupUrls = function(groupCallback) {
                                                                    var doAjax = function() {
                                                                        if (overfLurl[0]) {
                                                                            var groupURL = overfLurl[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                                            $.ajax({
                                                                                url: overfLurl[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                                success: function(response) {
                                                                                    var groupArrayContainer = response.result;
                                                                                    var groupArray;
                                                                                    groupArray = groupArrayContainer.facetValues;
                                                                                    var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                                    for (var keyAG in urlResultData.urlLits) {
                                                                                        if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                                    }
                                                                                    if (urlResultData.bigArr.length) {
                                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                                            groupResults.push({
                                                                                                "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                                "count": 999,
                                                                                                "totalcount": totalCount
                                                                                            });
                                                                                            totalProfilesFound += 999;
                                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                            if (percentComplete >= 99) {
                                                                                                percentComplete = 99;
                                                                                            }
                                                                                            eventDispatcher.postMessage({
                                                                                                percent: percentComplete
                                                                                            });
                                                                                        }
                                                                                    }
                                                                                    overfLurl.shift();
                                                                                    doAjax();
                                                                                },
                                                                                error: function(error) {
                                                                                    doAjax();
                                                                                }
                                                                            });
                                                                        } else {
                                                                            groupCallback(groupResults, groupBigArray);
                                                                        }
                                                                    }
                                                                    doAjax();
                                                                }
                                                                getNewGroupUrls(function(groupResults, groupBigArray) {
                                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                                    if (arrayResults[0]) {
                                                                        for (var loop in arrayResults) {
                                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                                        }
                                                                        callback(arrayResults);
                                                                    } else {
                                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                                        callback([{
                                                                            'url': cur_url,
                                                                            count: -1
                                                                        }]);
                                                                    }
                                                                });
                                                            }
                                                        } else {
                                                            arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                                            if (arrayResults[0]) {
                                                                for (var loop in arrayResults) {
                                                                    Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                                }
                                                                callback(arrayResults);
                                                            } else {
                                                                Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                                callback([{
                                                                    'url': cur_url,
                                                                    count: -1
                                                                }]);
                                                            }
                                                        }
                                                    });
                                                } else {
                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults);
                                                    if (arrayResults[0]) {
                                                        for (var loop in arrayResults) {
                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                        }
                                                        callback(arrayResults);
                                                    } else {
                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                        callback([{
                                                            'url': cur_url,
                                                            count: -1
                                                        }]);
                                                    }
                                                }
                                            });
                                        } else if (LinkedinSales.getParameterByName('facet.CS', cur_url).length == 1) {
                                            var getSeniorityUrlsOne = function(oneSeniorityCallback) {
                                                var doAjax = function() {
                                                    if (companyBigArray[0]) {
                                                        var seniorityURL = companyBigArray[0].replace("sales/search/facets/people", "sales/search") + "&facet=SE";
                                                        $.ajax({
                                                            url: companyBigArray[0],
                                                            success: function(response) {
                                                                var seniorityArrayContainer = response.facets;
                                                                var seniorityArray;
                                                                for (var i in seniorityArrayContainer) {
                                                                    if (seniorityArrayContainer[i].facetName == "Seniority level") {
                                                                        seniorityArray = seniorityArrayContainer[i].facetValues;
                                                                        break;
                                                                    }
                                                                }
                                                                eventDispatcher.postMessage({
                                                                    type: "F",
                                                                    senArr: seniorityArray
                                                                });

                                                                var urlResultData = getURLby(seniorityArray, seniorityURL, "facet.SE", totalCount);
                                                                for (var keyCE in urlResultData.urlLits) {
                                                                    if (urlResultData.urlLits[keyCE]['count']) seniorityResults.push(urlResultData.urlLits[keyCE]);
                                                                }
                                                                locationBigArray.shift();
                                                                doAjax();
                                                            },
                                                            error: function(error) {
                                                                doAjax();
                                                            }
                                                        });
                                                    } else {
                                                        oneSeniorityCallback(seniorityResults, seniorityBigArray);
                                                    }
                                                }
                                                doAjax();
                                            }
                                            getSeniorityUrlsOne(function(seniorityResults, seniorityBigArray) {
                                                arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                                if (arrayResults[0]) {
                                                    for (var loop in arrayResults) {
                                                        Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                    }
                                                    callback(arrayResults);
                                                } else {
                                                    Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                    callback([{
                                                        'url': cur_url,
                                                        count: -1
                                                    }]);
                                                }
                                            });
                                        } else {
                                            var fCSurl = [];
                                            for (var j in locationBigArray) {
                                                var fCS = LinkedinSales.getParameterByName('facet.CS', locationBigArray[j]);
                                                for (var i in fCS) {
                                                    fCSurl.push(LinkedinSales.removeParameterByName('facet.CS', locationBigArray[j]) + "&facet.CS=" + fCS[i]);
                                                }
                                            }
                                            if (cur_url.indexOf('facet.SE') == -1) {
                                                var getSeniorityUrlsOver = function(overSeniorityCallback) {
                                                    var doAjax = function() {
                                                        if (fCSurl[0]) {
                                                            var seniorityURL = fCSurl[0].replace("sales/search/facets/people", "sales/search") + "&facet=SE";
                                                            $.ajax({
                                                                url: fCSurl[0],
                                                                success: function(response) {
                                                                    var seniorityArrayContainer = response.facets;
                                                                    var seniorityArray;
                                                                    for (var i in seniorityArrayContainer) {
                                                                        if (seniorityArrayContainer[i].facetName == "Seniority level") {
                                                                            seniorityArray = seniorityArrayContainer[i].facetValues;
                                                                            break;
                                                                        }
                                                                    }
                                                                    eventDispatcher.postMessage({
                                                                        type: "G",
                                                                        senArr: seniorityArray
                                                                    });

                                                                    var urlResultData = getURLby(seniorityArray, seniorityURL, "facet.SE", totalCount);
                                                                    for (var keyCE in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyCE]['count']) seniorityResults.push(urlResultData.urlLits[keyCE]);
                                                                    }
                                                                    fCSurl.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            overSeniorityCallback(seniorityResults, seniorityBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                getSeniorityUrlsOver(function(seniorityResults, seniorityBigArray) {
                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                                    if (arrayResults[0]) {
                                                        for (var loop in arrayResults) {
                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                        }
                                                        callback(arrayResults);
                                                    } else {
                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                        callback([{
                                                            'url': cur_url,
                                                            count: -1
                                                        }]);
                                                    }
                                                });
                                            } else if (LinkedinSales.getParameterByName('facet.SE', cur_url).length == 1) {
                                                var getSeniorityUrlsOver = function(overSeniorityCallback) {
                                                    var doAjax = function() {
                                                        if (fCSurl[0]) {
                                                            var overSeniorityURL = fCSurl[0].replace("sales/search/facets/people", "sales/search");
                                                            $.ajax({
                                                                url: fCSurl[0].replace("sales/search/facets/people", "sales/search/results"),
                                                                success: function(response) {
                                                                    if (response) {
                                                                        var overSeniorityCount = response.pagination.total;
                                                                    } else {
                                                                        var overSeniorityCount = 0;
                                                                    }
                                                                    if (parseInt(overSeniorityCount) < maxVar) {
                                                                        seniorityResults.push({
                                                                            "url": overSeniorityURL.replace("sales/search/results", "sales/search"),
                                                                            "count": overSeniorityCount,
                                                                            "totalcount": totalCount
                                                                        });
                                                                        totalProfilesFound += overSeniorityCount;
                                                                        var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                        if (percentComplete >= 99) {
                                                                            percentComplete = 99;
                                                                        }
                                                                        eventDispatcher.postMessage({
                                                                            percent: percentComplete
                                                                        });
                                                                    }
                                                                    fCSurl.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            })
                                                        } else {
                                                            overSeniorityCallback(seniorityResults, seniorityBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                getSeniorityUrlsOver(function(seniorityResults, seniorityBigArray) {
                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                                    if (arrayResults[0]) {
                                                        for (var loop in arrayResults) {
                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                        }
                                                        callback(arrayResults);
                                                    } else {
                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                        callback([{
                                                            'url': cur_url,
                                                            count: -1
                                                        }]);
                                                    }
                                                });
                                            } else {
                                                var overfCE = LinkedinSales.getParameterByName('facet.SE', cur_url);
                                                var overfCEurl = [];
                                                for (var i in overfCE) {
                                                    for (var j in fCSurl) {
                                                        overfCEurl.push(LinkedinSales.removeParameterByName('facet.SE', fCSurl[j]) + "&facet.SE=" + overfCE[i]);
                                                    }
                                                }
                                                var getSeniorityUrlsOver = function(overSeniorityCallback) {
                                                    var doAjax = function() {
                                                        if (overfCEurl[0]) {
                                                            var overSeniorityURL = overfCEurl[0].replace("sales/search/facets/people", "sales/search");
                                                            $.ajax({
                                                                url: overfCEurl[0].replace("sales/search/facets/people", "sales/search/results"),
                                                                success: function(response) {
                                                                    if (response) {
                                                                        var overSeniorityCount = response.pagination.total;
                                                                    } else {
                                                                        var overSeniorityCount = 0;
                                                                    }
                                                                    if (overSeniorityCount < maxVar) {
                                                                        seniorityResults.push({
                                                                            "url": overSeniorityURL.replace("sales/search/results", "sales/search"),
                                                                            "count": overSeniorityCount,
                                                                            "totalcount": totalCount
                                                                        });
                                                                        totalProfilesFound += overSeniorityCount;
                                                                        var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                        if (percentComplete >= 99) {
                                                                            percentComplete = 99;
                                                                        }
                                                                        eventDispatcher.postMessage({
                                                                            percent: percentComplete
                                                                        });
                                                                    }
                                                                    overfCEurl.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            })
                                                        } else {
                                                            overSeniorityCallback(seniorityResults, seniorityBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                getSeniorityUrlsOver(function(seniorityResults, seniorityBigArray) {
                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                                    if (arrayResults[0]) {
                                                        for (var loop in arrayResults) {
                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                        }
                                                        callback(arrayResults);
                                                    } else {
                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                        callback([{
                                                            'url': cur_url,
                                                            count: -1
                                                        }]);
                                                    }
                                                });
                                            }
                                        }
                                    } else {
                                        arrayResults = industryResults.concat(locationResults);
                                        if (arrayResults[0]) {
                                            for (var loop in arrayResults) {
                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                            }
                                            callback(arrayResults);
                                        } else {
                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                            callback([{
                                                'url': cur_url,
                                                count: -1
                                            }]);
                                        }
                                    }
                                });
                            } else if (LinkedinSales.getParameterByName('facet.G', cur_url).length == 1) {
                                var getCompanyUrls = function(companyCallback) {
                                    var doAjax = function() {
                                        if (industryBigArray[0]) {
                                            var ajaxURI = cur_url.replace("sales/search/results", "sales/search/facets/people") + "&facet=I&facet.I=" + industryBigArray[0];
                                            var componysizeURL = cur_url.replace("sales/search/results", "sales/search") + "&facet=I&facet.I=" + industryBigArray[0] + "&facet=CS";
                                            $.ajax({
                                                url: ajaxURI,
                                                success: function(response) {
                                                    var componysizeArrayContainer = response.facets;
                                                    var componysizeArray;
                                                    for (var i in componysizeArrayContainer) {
                                                        if (componysizeArrayContainer[i].facetName == "Company size") {
                                                            componysizeArray = componysizeArrayContainer[i].facetValues;
                                                            break;
                                                        }
                                                    }
                                                    eventDispatcher.postMessage({
                                                        type: "G",
                                                        comArr: componysizeArray
                                                    });

                                                    var urlResultData = getURLby(componysizeArray, componysizeURL, "facet.CS", totalCount);
                                                    for (var keyCS in urlResultData.urlLits) {
                                                        if (urlResultData.urlLits[keyCS]['count']) companyResults.push(urlResultData.urlLits[keyCS]);
                                                    }
                                                    for (var key in urlResultData.bigArr) {
                                                        companyBigArray.push(componysizeURL.replace("sales/search", "sales/search/facets/people") + "&facet.CS=" + urlResultData.bigArr[key]);
                                                    }
                                                    industryBigArray.shift();
                                                    doAjax();
                                                },
                                                error: function(error) {
                                                    doAjax();
                                                }
                                            });
                                        } else {
                                            companyCallback(companyResults, companyBigArray);
                                        }
                                    }
                                    doAjax();
                                }
                                var getSeniorityUrls = function(seniorityCallback) {
                                    var doAjax = function() {
                                        if (companyBigArray[0]) {
                                            var seniorityURL = companyBigArray[0].replace("sales/search/facets/people", "sales/search") + "&facet=SE";
                                            $.ajax({
                                                url: companyBigArray[0],
                                                success: function(response) {
                                                    var seniorityArrayContainer = response.facets;
                                                    var seniorityArray;
                                                    for (var i in seniorityArrayContainer) {
                                                        if (seniorityArrayContainer[i].facetName == "Seniority level") {
                                                            seniorityArray = seniorityArrayContainer[i].facetValues;
                                                        }
                                                    }
                                                    eventDispatcher.postMessage({
                                                        type: "H",
                                                        senArr: seniorityArray
                                                    });


                                                    var urlResultData = getURLby(seniorityArray, seniorityURL, "facet.SE", totalCount);
                                                    for (var keyCE in urlResultData.urlLits) {
                                                        if (urlResultData.urlLits[keyCE]['count']) seniorityResults.push(urlResultData.urlLits[keyCE]);
                                                    }
                                                    for (var key in urlResultData.bigArr) {
                                                        seniorityBigArray.push(seniorityURL.replace("sales/search?", "sales/search/facets/people?") + "&facet.SE=" + urlResultData.bigArr[key]);
                                                    }
                                                    companyBigArray.shift();
                                                    doAjax();
                                                },
                                                error: function(error) {
                                                    doAjax();
                                                }
                                            });
                                        } else {
                                            seniorityCallback(seniorityResults, seniorityBigArray);
                                        }
                                    }
                                    doAjax();
                                }
                                if (cur_url.indexOf('facet.CS') == -1) {
                                    getCompanyUrls(function(companyResults, companyBigArray) {
                                        if (companyBigArray.length > 0) {
                                            getSeniorityUrls(function(seniorityResults, seniorityBigArray) {
                                                if (seniorityBigArray.length > 0) {
                                                    var getLanguageUrls = function(languageCallback) {
                                                        var doAjax = function() {
                                                            if (seniorityBigArray[0]) {
                                                                var languageURL = seniorityBigArray[0].replace("sales/search/results", "sales/search").replace("sales/search/facets/people?", "sales/search?") + "&facet=L";
                                                                $.ajax({
                                                                    url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?").replace("sales/search/facets/people?", "sales/search/expandFacet?") + "&shortName=L",
                                                                    success: function(response) {
                                                                        var languageArrayContainer = response.result;
                                                                        var languageArray;
                                                                        languageArray = languageArrayContainer.facetValues;
                                                                        var urlResultData = getURLby(languageArray, languageURL, "facet.L", totalCount);
                                                                        for (var keyCE in urlResultData.urlLits) {
                                                                            if (urlResultData.urlLits[keyCE]['count']) languageResults.push(urlResultData.urlLits[keyCE]);
                                                                        }
                                                                        if (urlResultData.bigArr.length) {
                                                                            for (var keyBig in urlResultData.bigArr) {
                                                                                languageResults.push({
                                                                                    "url": languageURL.replace("sales/search/results", "sales/search") + "&facet.L=" + urlResultData.bigArr[keyBig],
                                                                                    "count": 999,
                                                                                    "totalcount": totalCount
                                                                                });
                                                                                totalProfilesFound += 999;
                                                                                var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                if (percentComplete >= 99) {
                                                                                    percentComplete = 99;
                                                                                }
                                                                                eventDispatcher.postMessage({
                                                                                    percent: percentComplete
                                                                                });
                                                                            }
                                                                        }
                                                                        seniorityBigArray.shift();
                                                                        doAjax();
                                                                    },
                                                                    error: function(error) {
                                                                        doAjax();
                                                                    }
                                                                });
                                                            } else {
                                                                languageCallback(languageResults, languageBigArray);
                                                            }
                                                        }
                                                        doAjax();
                                                    }
                                                    var getGroupUrls = function(groupCallback) {
                                                        var doAjax = function() {
                                                            if (seniorityBigArray[0]) {
                                                                var groupURL = seniorityBigArray[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                                $.ajax({
                                                                    url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                    success: function(response) {
                                                                        var groupArrayContainer = response.result;
                                                                        var groupArray;
                                                                        groupArray = groupArrayContainer.facetValues;
                                                                        var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                        for (var keyAG in urlResultData.urlLits) {
                                                                            if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                        }
                                                                        if (urlResultData.bigArr.length) {
                                                                            for (var keyBig in urlResultData.bigArr) {
                                                                                groupResults.push({
                                                                                    "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                    "count": 999,
                                                                                    "totalcount": totalCount
                                                                                });
                                                                                totalProfilesFound += 999;
                                                                                var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                if (percentComplete >= 99) {
                                                                                    percentComplete = 99;
                                                                                }
                                                                                eventDispatcher.postMessage({
                                                                                    percent: percentComplete
                                                                                });
                                                                            }
                                                                        }
                                                                        seniorityBigArray.shift();
                                                                        doAjax();
                                                                    },
                                                                    error: function(error) {
                                                                        doAjax();
                                                                    }
                                                                });
                                                            } else {
                                                                groupCallback(groupResults, groupBigArray);
                                                            }
                                                        }
                                                        doAjax();
                                                    }
                                                    if (cur_url.indexOf('facet.L') == -1) {
                                                        getLanguageUrls(function(languageResults, languageBigArray) {
                                                            arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, languageResults);
                                                            if (arrayResults[0]) {
                                                                for (var loop in arrayResults) {
                                                                    Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                                }
                                                                callback(arrayResults);
                                                            } else {
                                                                Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                                callback([{
                                                                    'url': cur_url,
                                                                    count: -1
                                                                }]);
                                                            }
                                                        });
                                                    }else if (LinkedinSales.getParameterByName('facet.L', cur_url).length == 1) {
                                                        getGroupUrls(function(groupResults, groupBigArray) {
                                                            arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                            if (arrayResults[0]) {
                                                                for (var loop in arrayResults) {
                                                                    Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                                }
                                                                callback(arrayResults);
                                                            } else {
                                                                Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                                callback([{
                                                                    'url': cur_url,
                                                                    count: -1
                                                                }]);
                                                            }
                                                        });
                                                    }else {
                                                        var overfL = LinkedinSales.getParameterByName('facet.L', cur_url);
                                                        var overfLurl = [];
                                                        for (var SE in seniorityBigArray) {
                                                            for (var ol in overfL){
                                                                overfLurl.push(LinkedinSales.removeParameterByName('facet.L', seniorityBigArray[SE]) + "&facet.L=" + overfL[ol]);
                                                            }
                                                        };
                                                        var getNewGroupUrls = function(groupCallback) {
                                                            var doAjax = function() {
                                                                if (overfLurl[0]) {
                                                                    var groupURL = overfLurl[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                                    $.ajax({
                                                                        url: overfLurl[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                        success: function(response) {
                                                                            var groupArrayContainer = response.result;
                                                                            var groupArray;
                                                                            groupArray = groupArrayContainer.facetValues;
                                                                            var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                            for (var keyAG in urlResultData.urlLits) {
                                                                                if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                            }
                                                                            if (urlResultData.bigArr.length) {
                                                                                for (var keyBig in urlResultData.bigArr) {
                                                                                    groupResults.push({
                                                                                        "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                        "count": 999,
                                                                                        "totalcount": totalCount
                                                                                    });
                                                                                    totalProfilesFound += 999;
                                                                                    var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                    if (percentComplete >= 99) {
                                                                                        percentComplete = 99;
                                                                                    }
                                                                                    eventDispatcher.postMessage({
                                                                                        percent: percentComplete
                                                                                    });
                                                                                }
                                                                            }
                                                                            overfLurl.shift();
                                                                            doAjax();
                                                                        },
                                                                        error: function(error) {
                                                                            doAjax();
                                                                        }
                                                                    });
                                                                } else {
                                                                    groupCallback(groupResults, groupBigArray);
                                                                }
                                                            }
                                                            doAjax();
                                                        }
                                                        getNewGroupUrls(function(groupResults, groupBigArray) {
                                                            arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                            if (arrayResults[0]) {
                                                                for (var loop in arrayResults) {
                                                                    Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                                }
                                                                callback(arrayResults);
                                                            } else {
                                                                Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                                callback([{
                                                                    'url': cur_url,
                                                                    count: -1
                                                                }]);
                                                            }
                                                        });
                                                    }
                                                } else {
                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                                    if (arrayResults[0]) {
                                                        for (var loop in arrayResults) {
                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                        }
                                                        callback(arrayResults);
                                                    } else {
                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                        callback([{
                                                            'url': cur_url,
                                                            count: -1
                                                        }]);
                                                    }
                                                }
                                            });
                                        } else {
                                            arrayResults = industryResults.concat(locationResults, relationResults, companyResults);
                                            if (arrayResults[0]) {
                                                for (var loop in arrayResults) {
                                                    Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                }
                                                callback(arrayResults);
                                            } else {
                                                Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                callback([{
                                                    'url': cur_url,
                                                    count: -1
                                                }]);
                                            }
                                        }
                                    });
                                } else if (LinkedinSales.getParameterByName('facet.CS', cur_url).length == 1) {
                                    var getSeniorityUrlsOne = function(oneSeniorityCallback) {
                                        var doAjax = function() {
                                            if (industryBigArray[0]) {
                                                var ajaxURI = cur_url.replace("sales/search/results", "sales/search/facets/people") + "&facet=I&facet.I=" + industryBigArray[0];
                                                var seniorityURL = cur_url.replace("sales/search/results", "sales/search") + "&facet=I&facet.I=" + industryBigArray[0] + "&facet=SE";
                                                $.ajax({
                                                    url: ajaxURI,
                                                    success: function(response) {
                                                        var seniorityArrayContainer = response.facets;
                                                        var seniorityArray;
                                                        for (var i in seniorityArrayContainer) {
                                                            if (seniorityArrayContainer[i].facetName == "Seniority level") {
                                                                seniorityArray = seniorityArrayContainer[i].facetValues;
                                                                break;
                                                            }
                                                        }
                                                        eventDispatcher.postMessage({
                                                            type: "I",
                                                            senArr: seniorityArray
                                                        });

                                                        var urlResultData = getURLby(seniorityArray, seniorityURL, "facet.SE", totalCount);
                                                        for (var keyCE in urlResultData.urlLits) {
                                                            if (urlResultData.urlLits[keyCE]['count']) seniorityResults.push(urlResultData.urlLits[keyCE]);
                                                        }
                                                        for (var key in urlResultData.bigArr) {
                                                            seniorityBigArray.push(seniorityURL.replace("sales/search?", "sales/search/facets/people?") + "&facet.SE=" + urlResultData.bigArr[key]);
                                                        }
                                                        industryBigArray.shift();
                                                        doAjax();
                                                    },
                                                    error: function(error) {
                                                        doAjax();
                                                    }
                                                });
                                            } else {
                                                oneSeniorityCallback(seniorityResults, seniorityBigArray);
                                            }
                                        }
                                        doAjax();
                                    }
                                    getSeniorityUrlsOne(function(seniorityResults, seniorityBigArray) {
                                        if (seniorityBigArray.length > 0) {
                                            var getLanguageUrls = function(languageCallback) {
                                                var doAjax = function() {
                                                    if (seniorityBigArray[0]) {
                                                        var languageURL = seniorityBigArray[0].replace("sales/search/results", "sales/search").replace("sales/search/facets/people?", "sales/search?") + "&facet=L";
                                                        $.ajax({
                                                            url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?").replace("sales/search/facets/people?", "sales/search/expandFacet?") + "&shortName=L",
                                                            success: function(response) {
                                                                var languageArrayContainer = response.result;
                                                                var languageArray;
                                                                languageArray = languageArrayContainer.facetValues;
                                                                var urlResultData = getURLby(languageArray, languageURL, "facet.L", totalCount);
                                                                for (var keyCE in urlResultData.urlLits) {
                                                                    if (urlResultData.urlLits[keyCE]['count']) languageResults.push(urlResultData.urlLits[keyCE]);
                                                                }
                                                                if (urlResultData.bigArr.length) {
                                                                    for (var keyBig in urlResultData.bigArr) {
                                                                        languageResults.push({
                                                                            "url": languageURL.replace("sales/search/results", "sales/search") + "&facet.L=" + urlResultData.bigArr[keyBig],
                                                                            "count": 999,
                                                                            "totalcount": totalCount
                                                                        });
                                                                        totalProfilesFound += 999;
                                                                        var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                        if (percentComplete >= 99) {
                                                                            percentComplete = 99;
                                                                        }
                                                                        eventDispatcher.postMessage({
                                                                            percent: percentComplete
                                                                        });
                                                                    }
                                                                }
                                                                seniorityBigArray.shift();
                                                                doAjax();
                                                            },
                                                            error: function(error) {
                                                                doAjax();
                                                            }
                                                        });
                                                    } else {
                                                        languageCallback(languageResults, languageBigArray);
                                                    }
                                                }
                                                doAjax();
                                            }
                                            var getGroupUrls = function(groupCallback) {
                                                var doAjax = function() {
                                                    if (seniorityBigArray[0]) {
                                                        var groupURL = seniorityBigArray[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                        $.ajax({
                                                            url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                            success: function(response) {
                                                                var groupArrayContainer = response.result;
                                                                var groupArray;
                                                                groupArray = groupArrayContainer.facetValues;
                                                                var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                for (var keyAG in urlResultData.urlLits) {
                                                                    if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                }
                                                                if (urlResultData.bigArr.length) {
                                                                    for (var keyBig in urlResultData.bigArr) {
                                                                        groupResults.push({
                                                                            "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                            "count": 999,
                                                                            "totalcount": totalCount
                                                                        });
                                                                        totalProfilesFound += 999;
                                                                        var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                        if (percentComplete >= 99) {
                                                                            percentComplete = 99;
                                                                        }
                                                                        eventDispatcher.postMessage({
                                                                            percent: percentComplete
                                                                        });
                                                                    }
                                                                }
                                                                seniorityBigArray.shift();
                                                                doAjax();
                                                            },
                                                            error: function(error) {
                                                                doAjax();
                                                            }
                                                        });
                                                    } else {
                                                        groupCallback(groupResults, groupBigArray);
                                                    }
                                                }
                                                doAjax();
                                            }
                                            if (cur_url.indexOf('facet.L') == -1) {
                                                getLanguageUrls(function(languageResults, languageBigArray) {
                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, languageResults);
                                                    if (arrayResults[0]) {
                                                        for (var loop in arrayResults) {
                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                        }
                                                        callback(arrayResults);
                                                    } else {
                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                        callback([{
                                                            'url': cur_url,
                                                            count: -1
                                                        }]);
                                                    }
                                                });
                                            }else if (LinkedinSales.getParameterByName('facet.L', cur_url).length == 1) {
                                                getGroupUrls(function(groupResults, groupBigArray) {
                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                    if (arrayResults[0]) {
                                                        for (var loop in arrayResults) {
                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                        }
                                                        callback(arrayResults);
                                                    } else {
                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                        callback([{
                                                            'url': cur_url,
                                                            count: -1
                                                        }]);
                                                    }
                                                });
                                            }else {
                                                var overfL = LinkedinSales.getParameterByName('facet.L', cur_url);
                                                var overfLurl = [];
                                                for (var SE in seniorityBigArray) {
                                                    for (var ol in overfL){
                                                        overfLurl.push(LinkedinSales.removeParameterByName('facet.L', seniorityBigArray[SE]) + "&facet.L=" + overfL[ol]);
                                                    }
                                                };
                                                var getNewGroupUrls = function(groupCallback) {
                                                    var doAjax = function() {
                                                        if (overfLurl[0]) {
                                                            var groupURL = overfLurl[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                            $.ajax({
                                                                url: overfLurl[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                success: function(response) {
                                                                    var groupArrayContainer = response.result;
                                                                    var groupArray;
                                                                    groupArray = groupArrayContainer.facetValues;
                                                                    var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                    for (var keyAG in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                    }
                                                                    if (urlResultData.bigArr.length) {
                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                            groupResults.push({
                                                                                "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                "count": 999,
                                                                                "totalcount": totalCount
                                                                            });
                                                                            totalProfilesFound += 999;
                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                            if (percentComplete >= 99) {
                                                                                percentComplete = 99;
                                                                            }
                                                                            eventDispatcher.postMessage({
                                                                                percent: percentComplete
                                                                            });
                                                                        }
                                                                    }
                                                                    overfLurl.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            groupCallback(groupResults, groupBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                getNewGroupUrls(function(groupResults, groupBigArray) {
                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                    if (arrayResults[0]) {
                                                        for (var loop in arrayResults) {
                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                        }
                                                        callback(arrayResults);
                                                    } else {
                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                        callback([{
                                                            'url': cur_url,
                                                            count: -1
                                                        }]);
                                                    }
                                                });
                                            }
                                        } else {
                                            arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                            if (arrayResults[0]) {
                                                for (var loop in arrayResults) {
                                                    Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                }
                                                callback(arrayResults);
                                            } else {
                                                Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                callback([{
                                                    'url': cur_url,
                                                    count: -1
                                                }]);
                                            }
                                        }
                                    });
                                } else {
                                    var fCSurl = [];
                                    for (var j in industryBigArray) {
                                        var tmp_s = LinkedinSales.removeParameterByName('facet.I', cur_url) + "&facet.I=" + industryBigArray[j];
                                        var fCS = LinkedinSales.getParameterByName('facet.CS', tmp_s.replace("sales/search/results", "sales/search"));
                                        for (var i in fCS) {
                                            fCSurl.push(LinkedinSales.removeParameterByName('facet.CS', tmp_s) + "&facet.CS=" + fCS[i]);
                                        }
                                    }
                                    if (cur_url.indexOf('facet.SE') == -1) {
                                        var getSeniorityUrlsOver = function(overSeniorityCallback) {
                                            var doAjax = function() {
                                                if (fCSurl[0]) {
                                                    var seniorityURL = fCSurl[0].replace("sales/search/results", "sales/search") + "&facet=SE";
                                                    $.ajax({
                                                        url: fCSurl[0].replace("sales/search/results", "sales/search/facets/people"),
                                                        success: function(response) {
                                                            var seniorityArrayContainer = response.facets;
                                                            var seniorityArray;
                                                            for (var i in seniorityArrayContainer) {
                                                                if (seniorityArrayContainer[i].facetName == "Seniority level") {
                                                                    seniorityArray = seniorityArrayContainer[i].facetValues;
                                                                    break;
                                                                }
                                                            }
                                                            eventDispatcher.postMessage({
                                                                type: "J",
                                                                senArr: seniorityArray
                                                            });

                                                            var urlResultData = getURLby(seniorityArray, seniorityURL, "facet.SE", totalCount);
                                                            for (var keyCE in urlResultData.urlLits) {
                                                                if (urlResultData.urlLits[keyCE]['count']) seniorityResults.push(urlResultData.urlLits[keyCE]);
                                                            }
                                                            for (var key in urlResultData.bigArr) {
                                                                seniorityBigArray.push(seniorityURL.replace("sales/search?", "sales/search/facets/people?") + "&facet.SE=" + urlResultData.bigArr[key]);
                                                            }
                                                            fCSurl.shift();
                                                            doAjax();
                                                        },
                                                        error: function(error) {
                                                            doAjax();
                                                        }
                                                    });
                                                } else {
                                                    overSeniorityCallback(seniorityResults, seniorityBigArray);
                                                }
                                            }
                                            doAjax();
                                        }
                                        getSeniorityUrlsOver(function(seniorityResults, seniorityBigArray) {
                                            if (seniorityBigArray.length > 0) {
                                                var getLanguageUrls = function(languageCallback) {
                                                    var doAjax = function() {
                                                        if (seniorityBigArray[0]) {
                                                            var languageURL = seniorityBigArray[0].replace("sales/search/results", "sales/search").replace("sales/search/facets/people?", "sales/search?") + "&facet=L";
                                                            $.ajax({
                                                                url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?").replace("sales/search/facets/people?", "sales/search/expandFacet?") + "&shortName=L",
                                                                success: function(response) {
                                                                    var languageArrayContainer = response.result;
                                                                    var languageArray;
                                                                    languageArray = languageArrayContainer.facetValues;
                                                                    var urlResultData = getURLby(languageArray, languageURL, "facet.L", totalCount);
                                                                    for (var keyCE in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyCE]['count']) languageResults.push(urlResultData.urlLits[keyCE]);
                                                                    }
                                                                    if (urlResultData.bigArr.length) {
                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                            languageResults.push({
                                                                                "url": languageURL.replace("sales/search/results", "sales/search") + "&facet.L=" + urlResultData.bigArr[keyBig],
                                                                                "count": 999,
                                                                                "totalcount": totalCount
                                                                            });
                                                                            totalProfilesFound += 999;
                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                            if (percentComplete >= 99) {
                                                                                percentComplete = 99;
                                                                            }
                                                                            eventDispatcher.postMessage({
                                                                                percent: percentComplete
                                                                            });
                                                                        }
                                                                    }
                                                                    seniorityBigArray.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            languageCallback(languageResults, languageBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                var getGroupUrls = function(groupCallback) {
                                                    var doAjax = function() {
                                                        if (seniorityBigArray[0]) {
                                                            var groupURL = seniorityBigArray[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                            $.ajax({
                                                                url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                success: function(response) {
                                                                    var groupArrayContainer = response.result;
                                                                    var groupArray;
                                                                    groupArray = groupArrayContainer.facetValues;
                                                                    var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                    for (var keyAG in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                    }
                                                                    if (urlResultData.bigArr.length) {
                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                            groupResults.push({
                                                                                "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                "count": 999,
                                                                                "totalcount": totalCount
                                                                            });
                                                                            totalProfilesFound += 999;
                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                            if (percentComplete >= 99) {
                                                                                percentComplete = 99;
                                                                            }
                                                                            eventDispatcher.postMessage({
                                                                                percent: percentComplete
                                                                            });
                                                                        }
                                                                    }
                                                                    seniorityBigArray.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            groupCallback(groupResults, groupBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                if (cur_url.indexOf('facet.L') == -1) {
                                                    getLanguageUrls(function(languageResults, languageBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, languageResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }else if (LinkedinSales.getParameterByName('facet.L', cur_url).length == 1) {
                                                    getGroupUrls(function(groupResults, groupBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }else {
                                                    var overfL = LinkedinSales.getParameterByName('facet.L', cur_url);
                                                    var overfLurl = [];
                                                    for (var SE in seniorityBigArray) {
                                                        for (var ol in overfL){
                                                            overfLurl.push(LinkedinSales.removeParameterByName('facet.L', seniorityBigArray[SE]) + "&facet.L=" + overfL[ol]);
                                                        }
                                                    };
                                                    var getNewGroupUrls = function(groupCallback) {
                                                        var doAjax = function() {
                                                            if (overfLurl[0]) {
                                                                var groupURL = overfLurl[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                                $.ajax({
                                                                    url: overfLurl[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                    success: function(response) {
                                                                        var groupArrayContainer = response.result;
                                                                        var groupArray;
                                                                        groupArray = groupArrayContainer.facetValues;
                                                                        var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                        for (var keyAG in urlResultData.urlLits) {
                                                                            if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                        }
                                                                        if (urlResultData.bigArr.length) {
                                                                            for (var keyBig in urlResultData.bigArr) {
                                                                                groupResults.push({
                                                                                    "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                    "count": 999,
                                                                                    "totalcount": totalCount
                                                                                });
                                                                                totalProfilesFound += 999;
                                                                                var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                if (percentComplete >= 99) {
                                                                                    percentComplete = 99;
                                                                                }
                                                                                eventDispatcher.postMessage({
                                                                                    percent: percentComplete
                                                                                });
                                                                            }
                                                                        }
                                                                        overfLurl.shift();
                                                                        doAjax();
                                                                    },
                                                                    error: function(error) {
                                                                        doAjax();
                                                                    }
                                                                });
                                                            } else {
                                                                groupCallback(groupResults, groupBigArray);
                                                            }
                                                        }
                                                        doAjax();
                                                    }
                                                    getNewGroupUrls(function(groupResults, groupBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }
                                            } else {
                                                arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                                if (arrayResults[0]) {
                                                    for (var loop in arrayResults) {
                                                        Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                    }
                                                    callback(arrayResults);
                                                } else {
                                                    Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                    callback([{
                                                        'url': cur_url,
                                                        count: -1
                                                    }]);
                                                }
                                            }
                                        });
                                    } else if (LinkedinSales.getParameterByName('facet.SE', cur_url).length == 1) {
                                        var getSeniorityUrlsOver = function(overSeniorityCallback) {
                                            var doAjax = function() {
                                                if (fCSurl[0]) {
                                                    var overSeniorityURL = fCSurl[0].replace("sales/search/results", "sales/search");
                                                    $.ajax({
                                                        url: fCSurl[0],
                                                        success: function(response) {
                                                            if (response) {
                                                                var overSeniorityCount = response.pagination.total;
                                                            } else {
                                                                var overSeniorityCount = 0;
                                                            }
                                                            if (parseInt(overSeniorityCount) < maxVar) {
                                                                seniorityResults.push({
                                                                    "url": overSeniorityURL.replace("sales/search/results", "sales/search"),
                                                                    "count": overSeniorityCount,
                                                                    "totalcount": totalCount
                                                                });
                                                                totalProfilesFound += overSeniorityCount;
                                                                var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                if (percentComplete >= 99) {
                                                                    percentComplete = 99;
                                                                }
                                                                eventDispatcher.postMessage({
                                                                    percent: percentComplete
                                                                });
                                                            } else {
                                                                seniorityBigArray.push(overSeniorityURL.replace("sales/search/results?", "sales/search/facets/people?"));
                                                            }
                                                            fCSurl.shift();
                                                            doAjax();
                                                        },
                                                        error: function(error) {
                                                            doAjax();
                                                        }
                                                    })
                                                } else {
                                                    overSeniorityCallback(seniorityResults, seniorityBigArray);
                                                }
                                            }
                                            doAjax();
                                        }
                                        getSeniorityUrlsOver(function(seniorityResults, seniorityBigArray) {
                                            if (seniorityBigArray.length > 0) {
                                                var getLanguageUrls = function(languageCallback) {
                                                    var doAjax = function() {
                                                        if (seniorityBigArray[0]) {
                                                            var languageURL = seniorityBigArray[0].replace("sales/search/results", "sales/search").replace("sales/search/facets/people?", "sales/search?") + "&facet=L";
                                                            $.ajax({
                                                                url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?").replace("sales/search/facets/people?", "sales/search/expandFacet?") + "&shortName=L",
                                                                success: function(response) {
                                                                    var languageArrayContainer = response.result;
                                                                    var languageArray;
                                                                    languageArray = languageArrayContainer.facetValues;
                                                                    var urlResultData = getURLby(languageArray, languageURL, "facet.L", totalCount);
                                                                    for (var keyCE in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyCE]['count']) languageResults.push(urlResultData.urlLits[keyCE]);
                                                                    }
                                                                    if (urlResultData.bigArr.length) {
                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                            languageResults.push({
                                                                                "url": languageURL.replace("sales/search/results", "sales/search") + "&facet.L=" + urlResultData.bigArr[keyBig],
                                                                                "count": 999,
                                                                                "totalcount": totalCount
                                                                            });
                                                                            totalProfilesFound += 999;
                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                            if (percentComplete >= 99) {
                                                                                percentComplete = 99;
                                                                            }
                                                                            eventDispatcher.postMessage({
                                                                                percent: percentComplete
                                                                            });
                                                                        }
                                                                    }
                                                                    seniorityBigArray.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            languageCallback(languageResults, languageBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                var getGroupUrls = function(groupCallback) {
                                                    var doAjax = function() {
                                                        if (seniorityBigArray[0]) {
                                                            var groupURL = seniorityBigArray[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                            $.ajax({
                                                                url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                success: function(response) {
                                                                    var groupArrayContainer = response.result;
                                                                    var groupArray;
                                                                    groupArray = groupArrayContainer.facetValues;
                                                                    var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                    for (var keyAG in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                    }
                                                                    if (urlResultData.bigArr.length) {
                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                            groupResults.push({
                                                                                "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                "count": 999,
                                                                                "totalcount": totalCount
                                                                            });
                                                                            totalProfilesFound += 999;
                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                            if (percentComplete >= 99) {
                                                                                percentComplete = 99;
                                                                            }
                                                                            eventDispatcher.postMessage({
                                                                                percent: percentComplete
                                                                            });
                                                                        }
                                                                    }
                                                                    seniorityBigArray.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            groupCallback(groupResults, groupBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                if (cur_url.indexOf('facet.L') == -1) {
                                                    getLanguageUrls(function(languageResults, languageBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, languageResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }else if (LinkedinSales.getParameterByName('facet.L', cur_url).length == 1) {
                                                    getGroupUrls(function(groupResults, groupBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }else {
                                                    var overfL = LinkedinSales.getParameterByName('facet.L', cur_url);
                                                    var overfLurl = [];
                                                    for (var SE in seniorityBigArray) {
                                                        for (var ol in overfL){
                                                            overfLurl.push(LinkedinSales.removeParameterByName('facet.L', seniorityBigArray[SE]) + "&facet.L=" + overfL[ol]);
                                                        }
                                                    };
                                                    var getNewGroupUrls = function(groupCallback) {
                                                        var doAjax = function() {
                                                            if (overfLurl[0]) {
                                                                var groupURL = overfLurl[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                                $.ajax({
                                                                    url: overfLurl[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                    success: function(response) {
                                                                        var groupArrayContainer = response.result;
                                                                        var groupArray;
                                                                        groupArray = groupArrayContainer.facetValues;
                                                                        var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                        for (var keyAG in urlResultData.urlLits) {
                                                                            if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                        }
                                                                        if (urlResultData.bigArr.length) {
                                                                            for (var keyBig in urlResultData.bigArr) {
                                                                                groupResults.push({
                                                                                    "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                    "count": 999,
                                                                                    "totalcount": totalCount
                                                                                });
                                                                                totalProfilesFound += 999;
                                                                                var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                if (percentComplete >= 99) {
                                                                                    percentComplete = 99;
                                                                                }
                                                                                eventDispatcher.postMessage({
                                                                                    percent: percentComplete
                                                                                });
                                                                            }
                                                                        }
                                                                        overfLurl.shift();
                                                                        doAjax();
                                                                    },
                                                                    error: function(error) {
                                                                        doAjax();
                                                                    }
                                                                });
                                                            } else {
                                                                groupCallback(groupResults, groupBigArray);
                                                            }
                                                        }
                                                        doAjax();
                                                    }
                                                    getNewGroupUrls(function(groupResults, groupBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }
                                            } else {
                                                arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                                if (arrayResults[0]) {
                                                    for (var loop in arrayResults) {
                                                        Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                    }
                                                    callback(arrayResults);
                                                } else {
                                                    Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                    callback([{
                                                        'url': cur_url,
                                                        count: -1
                                                    }]);
                                                }
                                            }
                                        });
                                    } else {
                                        var overfCE = LinkedinSales.getParameterByName('facet.SE', cur_url);
                                        var overfCEurl = [];
                                        for (var i in overfCE) {
                                            for (var j in fCSurl) {
                                                overfCEurl.push(LinkedinSales.removeParameterByName('facet.SE', fCSurl[j]) + "&facet.SE=" + overfCE[i]);
                                            }
                                        }
                                        var getSeniorityUrlsOver = function(overSeniorityCallback) {
                                            var doAjax = function() {
                                                if (overfCEurl[0]) {
                                                    var overSeniorityURL = overfCEurl[0].replace("sales/search/results", "sales/search");
                                                    $.ajax({
                                                        url: overfCEurl[0],
                                                        success: function(response) {
                                                            if (response) {
                                                                var overSeniorityCount = response.pagination.total;
                                                            } else {
                                                                var overSeniorityCount = 0;
                                                            }
                                                            if (overSeniorityCount < maxVar) {
                                                                seniorityResults.push({
                                                                    "url": overSeniorityURL.replace("sales/search/results", "sales/search"),
                                                                    "count": overSeniorityCount,
                                                                    "totalcount": totalCount
                                                                });
                                                                totalProfilesFound += overSeniorityCount;
                                                                var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                if (percentComplete >= 99) {
                                                                    percentComplete = 99;
                                                                }
                                                                eventDispatcher.postMessage({
                                                                    percent: percentComplete
                                                                });
                                                            } else {
                                                                seniorityBigArray.push(overSeniorityURL.replace("sales/search/results?", "sales/search/facets/people?"));
                                                            }
                                                            overfCEurl.shift();
                                                            doAjax();
                                                        },
                                                        error: function(error) {
                                                            doAjax();
                                                        }
                                                    })
                                                } else {
                                                    overSeniorityCallback(seniorityResults, seniorityBigArray);
                                                }
                                            }
                                            doAjax();
                                        }
                                        getSeniorityUrlsOver(function(seniorityResults, seniorityBigArray) {
                                            if (seniorityBigArray.length > 0) {
                                                var getLanguageUrls = function(languageCallback) {
                                                    var doAjax = function() {
                                                        if (seniorityBigArray[0]) {
                                                            var languageURL = seniorityBigArray[0].replace("sales/search/results", "sales/search").replace("sales/search/facets/people?", "sales/search?") + "&facet=L";
                                                            $.ajax({
                                                                url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?").replace("sales/search/facets/people?", "sales/search/expandFacet?") + "&shortName=L",
                                                                success: function(response) {
                                                                    var languageArrayContainer = response.result;
                                                                    var languageArray;
                                                                    languageArray = languageArrayContainer.facetValues;
                                                                    var urlResultData = getURLby(languageArray, languageURL, "facet.L", totalCount);
                                                                    for (var keyCE in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyCE]['count']) languageResults.push(urlResultData.urlLits[keyCE]);
                                                                    }
                                                                    if (urlResultData.bigArr.length) {
                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                            languageResults.push({
                                                                                "url": languageURL.replace("sales/search/results", "sales/search") + "&facet.L=" + urlResultData.bigArr[keyBig],
                                                                                "count": 999,
                                                                                "totalcount": totalCount
                                                                            });
                                                                            totalProfilesFound += 999;
                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                            if (percentComplete >= 99) {
                                                                                percentComplete = 99;
                                                                            }
                                                                            eventDispatcher.postMessage({
                                                                                percent: percentComplete
                                                                            });
                                                                        }
                                                                    }
                                                                    seniorityBigArray.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            languageCallback(languageResults, languageBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                var getGroupUrls = function(groupCallback) {
                                                    var doAjax = function() {
                                                        if (seniorityBigArray[0]) {
                                                            var groupURL = seniorityBigArray[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                            $.ajax({
                                                                url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                success: function(response) {
                                                                    var groupArrayContainer = response.result;
                                                                    var groupArray;
                                                                    groupArray = groupArrayContainer.facetValues;
                                                                    var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                    for (var keyAG in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                    }
                                                                    if (urlResultData.bigArr.length) {
                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                            groupResults.push({
                                                                                "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                "count": 999,
                                                                                "totalcount": totalCount
                                                                            });
                                                                            totalProfilesFound += 999;
                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                            if (percentComplete >= 99) {
                                                                                percentComplete = 99;
                                                                            }
                                                                            eventDispatcher.postMessage({
                                                                                percent: percentComplete
                                                                            });
                                                                        }
                                                                    }
                                                                    seniorityBigArray.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            groupCallback(groupResults, groupBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                if (cur_url.indexOf('facet.L') == -1) {
                                                    getLanguageUrls(function(languageResults, languageBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, languageResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }else if (LinkedinSales.getParameterByName('facet.L', cur_url).length == 1) {
                                                    getGroupUrls(function(groupResults, groupBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }else {
                                                    var overfL = LinkedinSales.getParameterByName('facet.L', cur_url);
                                                    var overfLurl = [];
                                                    for (var SE in seniorityBigArray) {
                                                        for (var ol in overfL){
                                                            overfLurl.push(LinkedinSales.removeParameterByName('facet.L', seniorityBigArray[SE]) + "&facet.L=" + overfL[ol]);
                                                        }
                                                    };
                                                    var getNewGroupUrls = function(groupCallback) {
                                                        var doAjax = function() {
                                                            if (overfLurl[0]) {
                                                                var groupURL = overfLurl[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                                $.ajax({
                                                                    url: overfLurl[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                    success: function(response) {
                                                                        var groupArrayContainer = response.result;
                                                                        var groupArray;
                                                                        groupArray = groupArrayContainer.facetValues;
                                                                        var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                        for (var keyAG in urlResultData.urlLits) {
                                                                            if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                        }
                                                                        if (urlResultData.bigArr.length) {
                                                                            for (var keyBig in urlResultData.bigArr) {
                                                                                groupResults.push({
                                                                                    "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                    "count": 999,
                                                                                    "totalcount": totalCount
                                                                                });
                                                                                totalProfilesFound += 999;
                                                                                var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                if (percentComplete >= 99) {
                                                                                    percentComplete = 99;
                                                                                }
                                                                                eventDispatcher.postMessage({
                                                                                    percent: percentComplete
                                                                                });
                                                                            }
                                                                        }
                                                                        overfLurl.shift();
                                                                        doAjax();
                                                                    },
                                                                    error: function(error) {
                                                                        doAjax();
                                                                    }
                                                                });
                                                            } else {
                                                                groupCallback(groupResults, groupBigArray);
                                                            }
                                                        }
                                                        doAjax();
                                                    }
                                                    getNewGroupUrls(function(groupResults, groupBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }
                                            } else {
                                                arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                                if (arrayResults[0]) {
                                                    for (var loop in arrayResults) {
                                                        Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                    }
                                                    callback(arrayResults);
                                                } else {
                                                    Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                    callback([{
                                                        'url': cur_url,
                                                        count: -1
                                                    }]);
                                                }
                                            }
                                        });
                                    }
                                }
                            } else {
                                var fGurl = [];
                                var fG = LinkedinSales.getParameterByName('facet.G', cur_url);
                                for (var j in industryBigArray) {
                                    var tmp_s = LinkedinSales.removeParameterByName('facet.I', cur_url) + "&facet.I=" + industryBigArray[j];
                                    console.log("big location url >>>>>>>>>");
                                    for (var i in fG) {
                                        console.log(LinkedinSales.removeParameterByName('facet.G', tmp_s) + "&facet.G=" + fG[i]);
                                        fGurl.push(LinkedinSales.removeParameterByName('facet.G', tmp_s) + "&facet.G=" + fG[i]);
                                    }
                                    console.log("big location url <<<<<<<<<");
                                }
                                var getCompanyUrls = function(companyCallback) {
                                    var doAjax = function() {
                                        if (fGurl[0]) {
                                            var componysizeURL = fGurl[0].replace("sales/search/results", "sales/search") + "&facet=CS";
                                            $.ajax({
                                                url: fGurl[0].replace("sales/search/results", "sales/search/facets/people"),
                                                success: function(response) {
                                                    var componysizeArrayContainer = response.facets;
                                                    var componysizeArray;
                                                    for (var i in componysizeArrayContainer) {
                                                        if (componysizeArrayContainer[i].facetName == "Company size") {
                                                            componysizeArray = componysizeArrayContainer[i].facetValues;
                                                            break;
                                                        }
                                                    }
                                                    eventDispatcher.postMessage({
                                                        type: "K",
                                                        comArr: componysizeArray
                                                    });

                                                    var urlResultData = getURLby(componysizeArray, componysizeURL, "facet.CS", totalCount);
                                                    for (var keyCS in urlResultData.urlLits) {
                                                        if (urlResultData.urlLits[keyCS]['count']) companyResults.push(urlResultData.urlLits[keyCS]);
                                                    }
                                                    for (var key in urlResultData.bigArr) {
                                                        companyBigArray.push(componysizeURL.replace("sales/search", "sales/search/facets/people") + "&facet.CS=" + urlResultData.bigArr[key]);
                                                    }
                                                    fGurl.shift();
                                                    doAjax();
                                                },
                                                error: function(error) {
                                                    doAjax();
                                                }
                                            });
                                        } else {
                                            companyCallback(companyResults, companyBigArray);
                                        }
                                    }
                                    doAjax();
                                }
                                var getSeniorityUrls = function(seniorityCallback) {
                                    var doAjax = function() {
                                        if (companyBigArray[0]) {
                                            var seniorityURL = companyBigArray[0].replace("sales/search/facets/people", "sales/search") + "&facet=SE";
                                            $.ajax({
                                                url: companyBigArray[0],
                                                success: function(response) {
                                                    var seniorityArrayContainer = response.facets;
                                                    var seniorityArray;
                                                    for (var i in seniorityArrayContainer) {
                                                        if (seniorityArrayContainer[i].facetName == "Seniority level") {
                                                            seniorityArray = seniorityArrayContainer[i].facetValues;
                                                        }
                                                    }
                                                    eventDispatcher.postMessage({
                                                        type: "L",
                                                        senArr: seniorityArray
                                                    });

                                                    var urlResultData = getURLby(seniorityArray, seniorityURL, "facet.SE", totalCount);
                                                    for (var keyCE in urlResultData.urlLits) {
                                                        if (urlResultData.urlLits[keyCE]['count']) seniorityResults.push(urlResultData.urlLits[keyCE]);
                                                    }
                                                    for (var key in urlResultData.bigArr) {
                                                        seniorityBigArray.push(seniorityURL.replace("sales/search?", "sales/search/facets/people?") + "&facet.SE=" + urlResultData.bigArr[key]);
                                                    }
                                                    companyBigArray.shift();
                                                    doAjax();
                                                },
                                                error: function(error) {
                                                    doAjax();
                                                }
                                            });
                                        } else {
                                            seniorityCallback(seniorityResults, seniorityBigArray);
                                        }
                                    }
                                    doAjax();
                                }
                                if (cur_url.indexOf('facet.CS') == -1) {
                                    getCompanyUrls(function(companyResults, companyBigArray) {
                                        if (companyBigArray.length > 0) {
                                            getSeniorityUrls(function(seniorityResults, seniorityBigArray) {
                                                if (seniorityBigArray.length > 0) {
                                                    var getLanguageUrls = function(languageCallback) {
                                                        var doAjax = function() {
                                                            if (seniorityBigArray[0]) {
                                                                var languageURL = seniorityBigArray[0].replace("sales/search/results", "sales/search").replace("sales/search/facets/people?", "sales/search?") + "&facet=L";
                                                                $.ajax({
                                                                    url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?").replace("sales/search/facets/people?", "sales/search/expandFacet?") + "&shortName=L",
                                                                    success: function(response) {
                                                                        var languageArrayContainer = response.result;
                                                                        var languageArray;
                                                                        languageArray = languageArrayContainer.facetValues;
                                                                        var urlResultData = getURLby(languageArray, languageURL, "facet.L", totalCount);
                                                                        for (var keyCE in urlResultData.urlLits) {
                                                                            if (urlResultData.urlLits[keyCE]['count']) languageResults.push(urlResultData.urlLits[keyCE]);
                                                                        }
                                                                        if (urlResultData.bigArr.length) {
                                                                            for (var keyBig in urlResultData.bigArr) {
                                                                                languageResults.push({
                                                                                    "url": languageURL.replace("sales/search/results", "sales/search") + "&facet.L=" + urlResultData.bigArr[keyBig],
                                                                                    "count": 999,
                                                                                    "totalcount": totalCount
                                                                                });
                                                                                totalProfilesFound += 999;
                                                                                var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                if (percentComplete >= 99) {
                                                                                    percentComplete = 99;
                                                                                }
                                                                                eventDispatcher.postMessage({
                                                                                    percent: percentComplete
                                                                                });
                                                                            }
                                                                        }
                                                                        seniorityBigArray.shift();
                                                                        doAjax();
                                                                    },
                                                                    error: function(error) {
                                                                        doAjax();
                                                                    }
                                                                });
                                                            } else {
                                                                languageCallback(languageResults, languageBigArray);
                                                            }
                                                        }
                                                        doAjax();
                                                    }
                                                    var getGroupUrls = function(groupCallback) {
                                                        var doAjax = function() {
                                                            if (seniorityBigArray[0]) {
                                                                var groupURL = seniorityBigArray[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                                $.ajax({
                                                                    url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                    success: function(response) {
                                                                        var groupArrayContainer = response.result;
                                                                        var groupArray;
                                                                        groupArray = groupArrayContainer.facetValues;
                                                                        var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                        for (var keyAG in urlResultData.urlLits) {
                                                                            if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                        }
                                                                        if (urlResultData.bigArr.length) {
                                                                            for (var keyBig in urlResultData.bigArr) {
                                                                                groupResults.push({
                                                                                    "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                    "count": 999,
                                                                                    "totalcount": totalCount
                                                                                });
                                                                                totalProfilesFound += 999;
                                                                                var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                if (percentComplete >= 99) {
                                                                                    percentComplete = 99;
                                                                                }
                                                                                eventDispatcher.postMessage({
                                                                                    percent: percentComplete
                                                                                });
                                                                            }
                                                                        }
                                                                        seniorityBigArray.shift();
                                                                        doAjax();
                                                                    },
                                                                    error: function(error) {
                                                                        doAjax();
                                                                    }
                                                                });
                                                            } else {
                                                                groupCallback(groupResults, groupBigArray);
                                                            }
                                                        }
                                                        doAjax();
                                                    }
                                                    if (cur_url.indexOf('facet.L') == -1) {
                                                        getLanguageUrls(function(languageResults, languageBigArray) {
                                                            arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, languageResults);
                                                            if (arrayResults[0]) {
                                                                for (var loop in arrayResults) {
                                                                    Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                                }
                                                                callback(arrayResults);
                                                            } else {
                                                                Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                                callback([{
                                                                    'url': cur_url,
                                                                    count: -1
                                                                }]);
                                                            }
                                                        });
                                                    }else if (LinkedinSales.getParameterByName('facet.L', cur_url).length == 1) {
                                                        getGroupUrls(function(groupResults, groupBigArray) {
                                                            arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                            if (arrayResults[0]) {
                                                                for (var loop in arrayResults) {
                                                                    Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                                }
                                                                callback(arrayResults);
                                                            } else {
                                                                Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                                callback([{
                                                                    'url': cur_url,
                                                                    count: -1
                                                                }]);
                                                            }
                                                        });
                                                    }else {
                                                        var overfL = LinkedinSales.getParameterByName('facet.L', cur_url);
                                                        var overfLurl = [];
                                                        for (var SE in seniorityBigArray) {
                                                            for (var ol in overfL){
                                                                overfLurl.push(LinkedinSales.removeParameterByName('facet.L', seniorityBigArray[SE]) + "&facet.L=" + overfL[ol]);
                                                            }
                                                        };
                                                        var getNewGroupUrls = function(groupCallback) {
                                                            var doAjax = function() {
                                                                if (overfLurl[0]) {
                                                                    var groupURL = overfLurl[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                                    $.ajax({
                                                                        url: overfLurl[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                        success: function(response) {
                                                                            var groupArrayContainer = response.result;
                                                                            var groupArray;
                                                                            groupArray = groupArrayContainer.facetValues;
                                                                            var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                            for (var keyAG in urlResultData.urlLits) {
                                                                                if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                            }
                                                                            if (urlResultData.bigArr.length) {
                                                                                for (var keyBig in urlResultData.bigArr) {
                                                                                    groupResults.push({
                                                                                        "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                        "count": 999,
                                                                                        "totalcount": totalCount
                                                                                    });
                                                                                    totalProfilesFound += 999;
                                                                                    var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                    if (percentComplete >= 99) {
                                                                                        percentComplete = 99;
                                                                                    }
                                                                                    eventDispatcher.postMessage({
                                                                                        percent: percentComplete
                                                                                    });
                                                                                }
                                                                            }
                                                                            overfLurl.shift();
                                                                            doAjax();
                                                                        },
                                                                        error: function(error) {
                                                                            doAjax();
                                                                        }
                                                                    });
                                                                } else {
                                                                    groupCallback(groupResults, groupBigArray);
                                                                }
                                                            }
                                                            doAjax();
                                                        }
                                                        getNewGroupUrls(function(groupResults, groupBigArray) {
                                                            arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                            if (arrayResults[0]) {
                                                                for (var loop in arrayResults) {
                                                                    Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                                }
                                                                callback(arrayResults);
                                                            } else {
                                                                Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                                callback([{
                                                                    'url': cur_url,
                                                                    count: -1
                                                                }]);
                                                            }
                                                        });
                                                    }
                                                } else {
                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                                    if (arrayResults[0]) {
                                                        for (var loop in arrayResults) {
                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                        }
                                                        callback(arrayResults);
                                                    } else {
                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                        callback([{
                                                            'url': cur_url,
                                                            count: -1
                                                        }]);
                                                    }
                                                }
                                            });
                                        } else {
                                            arrayResults = industryResults.concat(locationResults, relationResults, companyResults);
                                            if (arrayResults[0]) {
                                                for (var loop in arrayResults) {
                                                    Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                }
                                                callback(arrayResults);
                                            } else {
                                                Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                callback([{
                                                    'url': cur_url,
                                                    count: -1
                                                }]);
                                            }
                                        }
                                    });
                                } else if (LinkedinSales.getParameterByName('facet.CS', cur_url).length == 1) {
                                    var getSeniorityUrlsOne = function(oneSeniorityCallback) {
                                        var doAjax = function() {
                                            if (fGurl[0]) {
                                                var seniorityURL = fGurl[0].replace("sales/search/results", "sales/search") + "&facet=SE";
                                                $.ajax({
                                                    url: fGurl[0].replace("sales/search/results", "sales/search/facets/people"),
                                                    success: function(response) {
                                                        var seniorityArrayContainer = response.facets;
                                                        var seniorityArray;
                                                        for (var i in seniorityArrayContainer) {
                                                            if (seniorityArrayContainer[i].facetName == "Seniority level") {
                                                                seniorityArray = seniorityArrayContainer[i].facetValues;
                                                                break;
                                                            }
                                                        }
                                                        eventDispatcher.postMessage({
                                                            type: "m",
                                                            senArr: seniorityArray
                                                        });

                                                        var urlResultData = getURLby(seniorityArray, seniorityURL, "facet.SE", totalCount);
                                                        for (var keyCE in urlResultData.urlLits) {
                                                            if (urlResultData.urlLits[keyCE]['count']) seniorityResults.push(urlResultData.urlLits[keyCE]);
                                                        }
                                                        for (var key in urlResultData.bigArr) {
                                                            seniorityBigArray.push(seniorityURL.replace("sales/search?", "sales/search/facets/people?") + "&facet.SE=" + urlResultData.bigArr[key]);
                                                        }
                                                        fGurl.shift();
                                                        doAjax();
                                                    },
                                                    error: function(error) {
                                                        doAjax();
                                                    }
                                                });
                                            } else {
                                                oneSeniorityCallback(seniorityResults, seniorityBigArray);
                                            }
                                        }
                                        doAjax();
                                    }
                                    getSeniorityUrlsOne(function(seniorityResults, seniorityBigArray) {
                                        if (seniorityBigArray.length > 0) {
                                            var getLanguageUrls = function(languageCallback) {
                                                var doAjax = function() {
                                                    if (seniorityBigArray[0]) {
                                                        var languageURL = seniorityBigArray[0].replace("sales/search/results", "sales/search").replace("sales/search/facets/people?", "sales/search?") + "&facet=L";
                                                        $.ajax({
                                                            url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?").replace("sales/search/facets/people?", "sales/search/expandFacet?") + "&shortName=L",
                                                            success: function(response) {
                                                                var languageArrayContainer = response.result;
                                                                var languageArray;
                                                                languageArray = languageArrayContainer.facetValues;
                                                                var urlResultData = getURLby(languageArray, languageURL, "facet.L", totalCount);
                                                                for (var keyCE in urlResultData.urlLits) {
                                                                    if (urlResultData.urlLits[keyCE]['count']) languageResults.push(urlResultData.urlLits[keyCE]);
                                                                }
                                                                if (urlResultData.bigArr.length) {
                                                                    for (var keyBig in urlResultData.bigArr) {
                                                                        languageResults.push({
                                                                            "url": languageURL.replace("sales/search/results", "sales/search") + "&facet.L=" + urlResultData.bigArr[keyBig],
                                                                            "count": 999,
                                                                            "totalcount": totalCount
                                                                        });
                                                                        totalProfilesFound += 999;
                                                                        var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                        if (percentComplete >= 99) {
                                                                            percentComplete = 99;
                                                                        }
                                                                        eventDispatcher.postMessage({
                                                                            percent: percentComplete
                                                                        });
                                                                    }
                                                                }
                                                                seniorityBigArray.shift();
                                                                doAjax();
                                                            },
                                                            error: function(error) {
                                                                doAjax();
                                                            }
                                                        });
                                                    } else {
                                                        languageCallback(languageResults, languageBigArray);
                                                    }
                                                }
                                                doAjax();
                                            }
                                            var getGroupUrls = function(groupCallback) {
                                                var doAjax = function() {
                                                    if (seniorityBigArray[0]) {
                                                        var groupURL = seniorityBigArray[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                        $.ajax({
                                                            url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                            success: function(response) {
                                                                var groupArrayContainer = response.result;
                                                                var groupArray;
                                                                groupArray = groupArrayContainer.facetValues;
                                                                var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                for (var keyAG in urlResultData.urlLits) {
                                                                    if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                }
                                                                if (urlResultData.bigArr.length) {
                                                                    for (var keyBig in urlResultData.bigArr) {
                                                                        groupResults.push({
                                                                            "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                            "count": 999,
                                                                            "totalcount": totalCount
                                                                        });
                                                                        totalProfilesFound += 999;
                                                                        var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                        if (percentComplete >= 99) {
                                                                            percentComplete = 99;
                                                                        }
                                                                        eventDispatcher.postMessage({
                                                                            percent: percentComplete
                                                                        });
                                                                    }
                                                                }
                                                                seniorityBigArray.shift();
                                                                doAjax();
                                                            },
                                                            error: function(error) {
                                                                doAjax();
                                                            }
                                                        });
                                                    } else {
                                                        groupCallback(groupResults, groupBigArray);
                                                    }
                                                }
                                                doAjax();
                                            }
                                            if (cur_url.indexOf('facet.L') == -1) {
                                                getLanguageUrls(function(languageResults, languageBigArray) {
                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, languageResults);
                                                    if (arrayResults[0]) {
                                                        for (var loop in arrayResults) {
                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                        }
                                                        callback(arrayResults);
                                                    } else {
                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                        callback([{
                                                            'url': cur_url,
                                                            count: -1
                                                        }]);
                                                    }
                                                });
                                            }else if (LinkedinSales.getParameterByName('facet.L', cur_url).length == 1) {
                                                getGroupUrls(function(groupResults, groupBigArray) {
                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                    if (arrayResults[0]) {
                                                        for (var loop in arrayResults) {
                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                        }
                                                        callback(arrayResults);
                                                    } else {
                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                        callback([{
                                                            'url': cur_url,
                                                            count: -1
                                                        }]);
                                                    }
                                                });
                                            }else {
                                                var overfL = LinkedinSales.getParameterByName('facet.L', cur_url);
                                                var overfLurl = [];
                                                for (var SE in seniorityBigArray) {
                                                    for (var ol in overfL){
                                                        overfLurl.push(LinkedinSales.removeParameterByName('facet.L', seniorityBigArray[SE]) + "&facet.L=" + overfL[ol]);
                                                    }
                                                };
                                                var getNewGroupUrls = function(groupCallback) {
                                                    var doAjax = function() {
                                                        if (overfLurl[0]) {
                                                            var groupURL = overfLurl[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                            $.ajax({
                                                                url: overfLurl[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                success: function(response) {
                                                                    var groupArrayContainer = response.result;
                                                                    var groupArray;
                                                                    groupArray = groupArrayContainer.facetValues;
                                                                    var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                    for (var keyAG in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                    }
                                                                    if (urlResultData.bigArr.length) {
                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                            groupResults.push({
                                                                                "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                "count": 999,
                                                                                "totalcount": totalCount
                                                                            });
                                                                            totalProfilesFound += 999;
                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                            if (percentComplete >= 99) {
                                                                                percentComplete = 99;
                                                                            }
                                                                            eventDispatcher.postMessage({
                                                                                percent: percentComplete
                                                                            });
                                                                        }
                                                                    }
                                                                    overfLurl.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            groupCallback(groupResults, groupBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                getNewGroupUrls(function(groupResults, groupBigArray) {
                                                    arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                    if (arrayResults[0]) {
                                                        for (var loop in arrayResults) {
                                                            Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                        }
                                                        callback(arrayResults);
                                                    } else {
                                                        Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                        callback([{
                                                            'url': cur_url,
                                                            count: -1
                                                        }]);
                                                    }
                                                });
                                            }
                                        } else {
                                            arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                            if (arrayResults[0]) {
                                                for (var loop in arrayResults) {
                                                    Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                }
                                                callback(arrayResults);
                                            } else {
                                                Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                callback([{
                                                    'url': cur_url,
                                                    count: -1
                                                }]);
                                            }
                                        }
                                    });
                                } else {
                                    var fCSurl = [];
                                    for (var j in fGurl) {
                                        var fCS = LinkedinSales.getParameterByName('facet.CS', fGurl[j]);
                                        for (var i in fCS) {
                                            fCSurl.push(LinkedinSales.removeParameterByName('facet.CS', fGurl[j]) + "&facet.CS=" + fCS[i]);
                                        }
                                    }
                                    if (cur_url.indexOf('facet.SE') == -1) {
                                        var getSeniorityUrlsOver = function(overSeniorityCallback) {
                                            var doAjax = function() {
                                                if (fCSurl[0]) {
                                                    
                                                    var seniorityURL = fCSurl[0].replace("sales/search/results", "sales/search/facets/people") + "&facet=SE";
                                                    console.log(seniorityURL);
                                                    $.ajax({
                                                        url: seniorityURL,
                                                        success: function(response) {
                                                            var seniorityArrayContainer = response.facets;
                                                            var seniorityArray = [];
                                                            for (var i in seniorityArrayContainer) {
                                                                if (seniorityArrayContainer[i].facetName == "Seniority level") {
                                                                    seniorityArray = seniorityArrayContainer[i].facetValues;
                                                                    break;
                                                                }
                                                            }
                                                            eventDispatcher.postMessage({
                                                                type: "N",
                                                                senArr: seniorityArray
                                                            });
                                                            seniorityURL = seniorityURL.replace("sales/search/facets/people", "sales/search/results");

                                                            var urlResultData = getURLby(seniorityArray, seniorityURL, "facet.SE", totalCount);
                                                            for (var keyCE in urlResultData.urlLits) {
                                                                if (urlResultData.urlLits[keyCE]['count']) seniorityResults.push(urlResultData.urlLits[keyCE]);
                                                            }
                                                            for (var key in urlResultData.bigArr) {
                                                                seniorityBigArray.push(seniorityURL.replace("sales/search?", "sales/search/facets/people?") + "&facet.SE=" + urlResultData.bigArr[key]);
                                                            }
                                                            fCSurl.shift();
                                                            doAjax();
                                                        },
                                                        error: function(error) {
                                                            doAjax();
                                                        }
                                                    });
                                                } else {
                                                    overSeniorityCallback(seniorityResults, seniorityBigArray);
                                                }
                                            }
                                            doAjax();
                                        }
                                        getSeniorityUrlsOver(function(seniorityResults, seniorityBigArray) {
                                            if (seniorityBigArray.length > 0) {
                                                var getLanguageUrls = function(languageCallback) {
                                                    var doAjax = function() {
                                                        if (seniorityBigArray[0]) {
                                                            var languageURL = seniorityBigArray[0].replace("sales/search/results", "sales/search").replace("sales/search/facets/people?", "sales/search?") + "&facet=L";
                                                            $.ajax({
                                                                url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?").replace("sales/search/facets/people?", "sales/search/expandFacet?") + "&shortName=L",
                                                                success: function(response) {
                                                                    var languageArrayContainer = response.result;
                                                                    var languageArray;
                                                                    languageArray = languageArrayContainer.facetValues;
                                                                    var urlResultData = getURLby(languageArray, languageURL, "facet.L", totalCount);
                                                                    for (var keyCE in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyCE]['count']) languageResults.push(urlResultData.urlLits[keyCE]);
                                                                    }
                                                                    if (urlResultData.bigArr.length) {
                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                            languageResults.push({
                                                                                "url": languageURL.replace("sales/search/results", "sales/search") + "&facet.L=" + urlResultData.bigArr[keyBig],
                                                                                "count": 999,
                                                                                "totalcount": totalCount
                                                                            });
                                                                            totalProfilesFound += 999;
                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                            if (percentComplete >= 99) {
                                                                                percentComplete = 99;
                                                                            }
                                                                            eventDispatcher.postMessage({
                                                                                percent: percentComplete
                                                                            });
                                                                        }
                                                                    }
                                                                    seniorityBigArray.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            languageCallback(languageResults, languageBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                var getGroupUrls = function(groupCallback) {
                                                    var doAjax = function() {
                                                        if (seniorityBigArray[0]) {
                                                            var groupURL = seniorityBigArray[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                            $.ajax({
                                                                url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                success: function(response) {
                                                                    var groupArrayContainer = response.result;
                                                                    var groupArray;
                                                                    groupArray = groupArrayContainer.facetValues;
                                                                    var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                    for (var keyAG in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                    }
                                                                    if (urlResultData.bigArr.length) {
                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                            groupResults.push({
                                                                                "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                "count": 999,
                                                                                "totalcount": totalCount
                                                                            });
                                                                            totalProfilesFound += 999;
                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                            if (percentComplete >= 99) {
                                                                                percentComplete = 99;
                                                                            }
                                                                            eventDispatcher.postMessage({
                                                                                percent: percentComplete
                                                                            });
                                                                        }
                                                                    }
                                                                    seniorityBigArray.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            groupCallback(groupResults, groupBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                if (cur_url.indexOf('facet.L') == -1) {
                                                    getLanguageUrls(function(languageResults, languageBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, languageResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }else if (LinkedinSales.getParameterByName('facet.L', cur_url).length == 1) {
                                                    getGroupUrls(function(groupResults, groupBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }else {
                                                    var overfL = LinkedinSales.getParameterByName('facet.L', cur_url);
                                                    var overfLurl = [];
                                                    for (var SE in seniorityBigArray) {
                                                        for (var ol in overfL){
                                                            overfLurl.push(LinkedinSales.removeParameterByName('facet.L', seniorityBigArray[SE]) + "&facet.L=" + overfL[ol]);
                                                        }
                                                    };
                                                    var getNewGroupUrls = function(groupCallback) {
                                                        var doAjax = function() {
                                                            if (overfLurl[0]) {
                                                                var groupURL = overfLurl[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                                $.ajax({
                                                                    url: overfLurl[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                    success: function(response) {
                                                                        var groupArrayContainer = response.result;
                                                                        var groupArray;
                                                                        groupArray = groupArrayContainer.facetValues;
                                                                        var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                        for (var keyAG in urlResultData.urlLits) {
                                                                            if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                        }
                                                                        if (urlResultData.bigArr.length) {
                                                                            for (var keyBig in urlResultData.bigArr) {
                                                                                groupResults.push({
                                                                                    "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                    "count": 999,
                                                                                    "totalcount": totalCount
                                                                                });
                                                                                totalProfilesFound += 999;
                                                                                var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                if (percentComplete >= 99) {
                                                                                    percentComplete = 99;
                                                                                }
                                                                                eventDispatcher.postMessage({
                                                                                    percent: percentComplete
                                                                                });
                                                                            }
                                                                        }
                                                                        overfLurl.shift();
                                                                        doAjax();
                                                                    },
                                                                    error: function(error) {
                                                                        doAjax();
                                                                    }
                                                                });
                                                            } else {
                                                                groupCallback(groupResults, groupBigArray);
                                                            }
                                                        }
                                                        doAjax();
                                                    }
                                                    getNewGroupUrls(function(groupResults, groupBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }
                                            } else {
                                                arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                                if (arrayResults[0]) {
                                                    for (var loop in arrayResults) {
                                                        Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                    }
                                                    callback(arrayResults);
                                                } else {
                                                    Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                    callback([{
                                                        'url': cur_url,
                                                        count: -1
                                                    }]);
                                                }
                                            }
                                        });
                                    } else if (LinkedinSales.getParameterByName('facet.SE', cur_url).length == 1) {
                                        var getSeniorityUrlsOver = function(overSeniorityCallback) {
                                            var doAjax = function() {
                                                if (fCSurl[0]) {
                                                    var overSeniorityURL = fCSurl[0].replace("sales/search/facets/people", "sales/search");
                                                    $.ajax({
                                                        url: fCSurl[0].replace("sales/search/facets/people", "sales/search/results"),
                                                        success: function(response) {
                                                            if (response) {
                                                                var overSeniorityCount = response.pagination.total;
                                                            } else {
                                                                var overSeniorityCount = 0;
                                                            }
                                                            if (parseInt(overSeniorityCount) < maxVar) {
                                                                seniorityResults.push({
                                                                    "url": overSeniorityURL.replace("sales/search/results", "sales/search"),
                                                                    "count": overSeniorityCount,
                                                                    "totalcount": totalCount
                                                                });
                                                                totalProfilesFound += overSeniorityCount;
                                                                var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                if (percentComplete >= 99) {
                                                                    percentComplete = 99;
                                                                }
                                                                eventDispatcher.postMessage({
                                                                    percent: percentComplete
                                                                });
                                                            } else {
                                                                seniorityBigArray.push(overSeniorityURL.replace("sales/search/results?", "sales/search/facets/people?"));
                                                            }
                                                            fCSurl.shift();
                                                            doAjax();
                                                        },
                                                        error: function(error) {
                                                            doAjax();
                                                        }
                                                    });
                                                } else {
                                                    overSeniorityCallback(seniorityResults, seniorityBigArray);
                                                }
                                            }
                                            doAjax();
                                        }
                                        getSeniorityUrlsOver(function(seniorityResults, seniorityBigArray) {
                                            if (seniorityBigArray.length > 0) {
                                                var getLanguageUrls = function(languageCallback) {
                                                    var doAjax = function() {
                                                        if (seniorityBigArray[0]) {
                                                            var languageURL = seniorityBigArray[0].replace("sales/search/results", "sales/search").replace("sales/search/facets/people?", "sales/search?") + "&facet=L";
                                                            $.ajax({
                                                                url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?").replace("sales/search/facets/people?", "sales/search/expandFacet?") + "&shortName=L",
                                                                success: function(response) {
                                                                    var languageArrayContainer = response.result;
                                                                    var languageArray;
                                                                    languageArray = languageArrayContainer.facetValues;
                                                                    var urlResultData = getURLby(languageArray, languageURL, "facet.L", totalCount);
                                                                    for (var keyCE in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyCE]['count']) languageResults.push(urlResultData.urlLits[keyCE]);
                                                                    }
                                                                    if (urlResultData.bigArr.length) {
                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                            languageResults.push({
                                                                                "url": languageURL.replace("sales/search/results", "sales/search") + "&facet.L=" + urlResultData.bigArr[keyBig],
                                                                                "count": 999,
                                                                                "totalcount": totalCount
                                                                            });
                                                                            totalProfilesFound += 999;
                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                            if (percentComplete >= 99) {
                                                                                percentComplete = 99;
                                                                            }
                                                                            eventDispatcher.postMessage({
                                                                                percent: percentComplete
                                                                            });
                                                                        }
                                                                    }
                                                                    seniorityBigArray.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            languageCallback(languageResults, languageBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                var getGroupUrls = function(groupCallback) {
                                                    var doAjax = function() {
                                                        if (seniorityBigArray[0]) {
                                                            var groupURL = seniorityBigArray[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                            $.ajax({
                                                                url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                success: function(response) {
                                                                    var groupArrayContainer = response.result;
                                                                    var groupArray;
                                                                    groupArray = groupArrayContainer.facetValues;
                                                                    var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                    for (var keyAG in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                    }
                                                                    if (urlResultData.bigArr.length) {
                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                            groupResults.push({
                                                                                "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                "count": 999,
                                                                                "totalcount": totalCount
                                                                            });
                                                                            totalProfilesFound += 999;
                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                            if (percentComplete >= 99) {
                                                                                percentComplete = 99;
                                                                            }
                                                                            eventDispatcher.postMessage({
                                                                                percent: percentComplete
                                                                            });
                                                                        }
                                                                    }
                                                                    seniorityBigArray.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            groupCallback(groupResults, groupBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                if (cur_url.indexOf('facet.L') == -1) {
                                                    getLanguageUrls(function(languageResults, languageBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, languageResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }else if (LinkedinSales.getParameterByName('facet.L', cur_url).length == 1) {
                                                    getGroupUrls(function(groupResults, groupBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }else {
                                                    var overfL = LinkedinSales.getParameterByName('facet.L', cur_url);
                                                    var overfLurl = [];
                                                    for (var SE in seniorityBigArray) {
                                                        for (var ol in overfL){
                                                            overfLurl.push(LinkedinSales.removeParameterByName('facet.L', seniorityBigArray[SE]) + "&facet.L=" + overfL[ol]);
                                                        }
                                                    };
                                                    var getNewGroupUrls = function(groupCallback) {
                                                        var doAjax = function() {
                                                            if (overfLurl[0]) {
                                                                var groupURL = overfLurl[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                                $.ajax({
                                                                    url: overfLurl[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                    success: function(response) {
                                                                        var groupArrayContainer = response.result;
                                                                        var groupArray;
                                                                        groupArray = groupArrayContainer.facetValues;
                                                                        var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                        for (var keyAG in urlResultData.urlLits) {
                                                                            if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                        }
                                                                        if (urlResultData.bigArr.length) {
                                                                            for (var keyBig in urlResultData.bigArr) {
                                                                                groupResults.push({
                                                                                    "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                    "count": 999,
                                                                                    "totalcount": totalCount
                                                                                });
                                                                                totalProfilesFound += 999;
                                                                                var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                if (percentComplete >= 99) {
                                                                                    percentComplete = 99;
                                                                                }
                                                                                eventDispatcher.postMessage({
                                                                                    percent: percentComplete
                                                                                });
                                                                            }
                                                                        }
                                                                        overfLurl.shift();
                                                                        doAjax();
                                                                    },
                                                                    error: function(error) {
                                                                        doAjax();
                                                                    }
                                                                });
                                                            } else {
                                                                groupCallback(groupResults, groupBigArray);
                                                            }
                                                        }
                                                        doAjax();
                                                    }
                                                    getNewGroupUrls(function(groupResults, groupBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }
                                            } else {
                                                arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                                if (arrayResults[0]) {
                                                    for (var loop in arrayResults) {
                                                        Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                    }
                                                    callback(arrayResults);
                                                } else {
                                                    Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                    callback([{
                                                        'url': cur_url,
                                                        count: -1
                                                    }]);
                                                }
                                            }
                                        });
                                    } else {
                                        var overfCE = LinkedinSales.getParameterByName('facet.SE', cur_url);
                                        var overfCEurl = [];
                                        for (var i in overfCE) {
                                            for (var j in fCSurl) {
                                                overfCEurl.push(LinkedinSales.removeParameterByName('facet.SE', fCSurl[j]) + "&facet.SE=" + overfCE[i]);
                                            }
                                        }
                                        var getSeniorityUrlsOver = function(overSeniorityCallback) {
                                            var doAjax = function() {
                                                if (overfCEurl[0]) {
                                                    var overSeniorityURL = overfCEurl[0].replace("sales/search/facets/people", "sales/search");
                                                    $.ajax({
                                                        url: overfCEurl[0].replace("sales/search/facets/people", "sales/search/results"),
                                                        success: function(response) {
                                                            if (response) {
                                                                var overSeniorityCount = response.pagination.total;
                                                            } else {
                                                                var overSeniorityCount = 0;
                                                            }
                                                            if (overSeniorityCount < maxVar) {
                                                                seniorityResults.push({
                                                                    "url": overSeniorityURL.replace("sales/search/results", "sales/search"),
                                                                    "count": overSeniorityCount,
                                                                    "totalcount": totalCount
                                                                });
                                                                totalProfilesFound += overSeniorityCount;
                                                                var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                if (percentComplete >= 99) {
                                                                    percentComplete = 99;
                                                                }
                                                                eventDispatcher.postMessage({
                                                                    percent: percentComplete
                                                                });
                                                            } else {
                                                                seniorityBigArray.push(overSeniorityURL.replace("sales/search/results?", "sales/search/facets/people?"));
                                                            }
                                                            overfCEurl.shift();
                                                            doAjax();
                                                        },
                                                        error: function(error) {
                                                            doAjax();
                                                        }
                                                    })
                                                } else {
                                                    overSeniorityCallback(seniorityResults, seniorityBigArray);
                                                }
                                            }
                                            doAjax();
                                        }
                                        getSeniorityUrlsOver(function(seniorityResults, seniorityBigArray) {
                                            if (seniorityBigArray.length > 0) {
                                                var getLanguageUrls = function(languageCallback) {
                                                    var doAjax = function() {
                                                        if (seniorityBigArray[0]) {
                                                            var languageURL = seniorityBigArray[0].replace("sales/search/results", "sales/search").replace("sales/search/facets/people?", "sales/search?") + "&facet=L";
                                                            $.ajax({
                                                                url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?").replace("sales/search/facets/people?", "sales/search/expandFacet?") + "&shortName=L",
                                                                success: function(response) {
                                                                    var languageArrayContainer = response.result;
                                                                    var languageArray;
                                                                    languageArray = languageArrayContainer.facetValues;
                                                                    var urlResultData = getURLby(languageArray, languageURL, "facet.L", totalCount);
                                                                    for (var keyCE in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyCE]['count']) languageResults.push(urlResultData.urlLits[keyCE]);
                                                                    }
                                                                    if (urlResultData.bigArr.length) {
                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                            languageResults.push({
                                                                                "url": languageURL.replace("sales/search/results", "sales/search") + "&facet.L=" + urlResultData.bigArr[keyBig],
                                                                                "count": 999,
                                                                                "totalcount": totalCount
                                                                            });
                                                                            totalProfilesFound += 999;
                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                            if (percentComplete >= 99) {
                                                                                percentComplete = 99;
                                                                            }
                                                                            eventDispatcher.postMessage({
                                                                                percent: percentComplete
                                                                            });
                                                                        }
                                                                    }
                                                                    seniorityBigArray.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            languageCallback(languageResults, languageBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                var getGroupUrls = function(groupCallback) {
                                                    var doAjax = function() {
                                                        if (seniorityBigArray[0]) {
                                                            var groupURL = seniorityBigArray[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                            $.ajax({
                                                                url: seniorityBigArray[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                success: function(response) {
                                                                    var groupArrayContainer = response.result;
                                                                    var groupArray;
                                                                    groupArray = groupArrayContainer.facetValues;
                                                                    var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                    for (var keyAG in urlResultData.urlLits) {
                                                                        if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                    }
                                                                    if (urlResultData.bigArr.length) {
                                                                        for (var keyBig in urlResultData.bigArr) {
                                                                            groupResults.push({
                                                                                "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                "count": 999,
                                                                                "totalcount": totalCount
                                                                            });
                                                                            totalProfilesFound += 999;
                                                                            var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                            if (percentComplete >= 99) {
                                                                                percentComplete = 99;
                                                                            }
                                                                            eventDispatcher.postMessage({
                                                                                percent: percentComplete
                                                                            });
                                                                        }
                                                                    }
                                                                    seniorityBigArray.shift();
                                                                    doAjax();
                                                                },
                                                                error: function(error) {
                                                                    doAjax();
                                                                }
                                                            });
                                                        } else {
                                                            groupCallback(groupResults, groupBigArray);
                                                        }
                                                    }
                                                    doAjax();
                                                }
                                                if (cur_url.indexOf('facet.L') == -1) {
                                                    getLanguageUrls(function(languageResults, languageBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, languageResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }else if (LinkedinSales.getParameterByName('facet.L', cur_url).length == 1) {
                                                    getGroupUrls(function(groupResults, groupBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }else {
                                                    var overfL = LinkedinSales.getParameterByName('facet.L', cur_url);
                                                    var overfLurl = [];
                                                    for (var SE in seniorityBigArray) {
                                                        for (var ol in overfL){
                                                            overfLurl.push(LinkedinSales.removeParameterByName('facet.L', seniorityBigArray[SE]) + "&facet.L=" + overfL[ol]);
                                                        }
                                                    };
                                                    var getNewGroupUrls = function(groupCallback) {
                                                        var doAjax = function() {
                                                            if (overfLurl[0]) {
                                                                var groupURL = overfLurl[0].replace("sales/search/results", "sales/search") + "&facet=AG";
                                                                $.ajax({
                                                                    url: overfLurl[0].replace("sales/search/results", "sales/search/expandFacet").replace("sales/search?", "sales/search/expandFacet?") + "&shortName=AG",
                                                                    success: function(response) {
                                                                        var groupArrayContainer = response.result;
                                                                        var groupArray;
                                                                        groupArray = groupArrayContainer.facetValues;
                                                                        var urlResultData = getURLby(groupArray, groupURL, "facet.AG", totalCount);
                                                                        for (var keyAG in urlResultData.urlLits) {
                                                                            if (urlResultData.urlLits[keyAG]['count']) groupResults.push(urlResultData.urlLits[keyAG]);
                                                                        }
                                                                        if (urlResultData.bigArr.length) {
                                                                            for (var keyBig in urlResultData.bigArr) {
                                                                                groupResults.push({
                                                                                    "url": groupURL.replace("sales/search/results", "sales/search") + "&facet.AG=" + urlResultData.bigArr[keyBig],
                                                                                    "count": 999,
                                                                                    "totalcount": totalCount
                                                                                });
                                                                                totalProfilesFound += 999;
                                                                                var percentComplete = Math.floor((totalProfilesFound / totalCount) * 100);
                                                                                if (percentComplete >= 99) {
                                                                                    percentComplete = 99;
                                                                                }
                                                                                eventDispatcher.postMessage({
                                                                                    percent: percentComplete
                                                                                });
                                                                            }
                                                                        }
                                                                        overfLurl.shift();
                                                                        doAjax();
                                                                    },
                                                                    error: function(error) {
                                                                        doAjax();
                                                                    }
                                                                });
                                                            } else {
                                                                groupCallback(groupResults, groupBigArray);
                                                            }
                                                        }
                                                        doAjax();
                                                    }
                                                    getNewGroupUrls(function(groupResults, groupBigArray) {
                                                        arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults, groupResults);
                                                        if (arrayResults[0]) {
                                                            for (var loop in arrayResults) {
                                                                Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                            }
                                                            callback(arrayResults);
                                                        } else {
                                                            Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                            callback([{
                                                                'url': cur_url,
                                                                count: -1
                                                            }]);
                                                        }
                                                    });
                                                }
                                            } else {
                                                arrayResults = industryResults.concat(locationResults, relationResults, companyResults, seniorityResults);
                                                if (arrayResults[0]) {
                                                    for (var loop in arrayResults) {
                                                        Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                                    }
                                                    callback(arrayResults);
                                                } else {
                                                    Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                                    callback([{
                                                        'url': cur_url,
                                                        count: -1
                                                    }]);
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                        } else {
                            arrayResults = industryResults;
                            if (arrayResults[0]) {
                                for (var loop in arrayResults) {
                                    Log.l("Sales Naviagator: ", "Splitted url " + arrayResults[loop].url);
                                }
                                callback(arrayResults);
                            } else {
                                Log.l("Sales Naviagator: ", "Can not split url " + cur_url);
                                callback([{
                                    'url': cur_url,
                                    count: -1
                                }]);
                            }
                        }
                    });
                }
            }
        });
    }, 

    fetchSavedSearches: function(callback) {
        $.ajax('https://www.linkedin.com/sales/savedSearches').done(function(searches) {
            var c = 0,
                k;
            if (searches != undefined && searches.hasOwnProperty('savedSearches')) {
                var cachedSearches = {};
                if (sessionStorage.getItem("savedSearches")) {
                    cachedSearches = JSON.parse(sessionStorage.getItem("savedSearches"));
                }
                for (var i in searches.savedSearches) {
                    (function(i) {
                        if (cachedSearches[searches.savedSearches[i].id] == undefined) {
                            var url = "https://www.linkedin.com/sales/search/results?savedSearchId=" + searches.savedSearches[i].id + "&resetFacets=false&defaultSelection=noOverride&EL=auto&count=15&start=10&isLazyLoad=false"
                            $.get(url).done(function(res) {
                                if (typeof res === "string") {
                                    try {
                                        var parser = new DOMParser();
                                        var documentProfile = parser.parseFromString(res, "text/html");
                                        var pageInfo = JSON.parse(documentProfile.querySelector("#__pageContext__").childNodes[0].data);
                                        if (~pageInfo.pageInstance.indexOf("sales-limit-exceeded")) {
                                            return callback("sales-limit-exceeded");
                                        } else {
                                            return callback(null);
                                        }
                                    } catch (e) {
                                        return callback(null);
                                    }
                                } else if (typeof res === "object") {
                                    searches.savedSearches[i].count = res.pagination.total;
                                    // get splotlights
                                    var facetsUrl = "https://www.linkedin.com/sales/search/facets/people?savedSearchId=" + searches.savedSearches[i].id + "&resetFacets=false"
                                    $.get(facetsUrl).done(function(fc) {
                                        searches.savedSearches[i].url = 'https://www.linkedin.com/sales/search?' + encodeURI(LinkedinSales.getFacetsCriteria(fc)) + "&updateHistory=true";
                                        searches.savedSearches[i].detail = LinkedinSales.getFacetsCriteriaName(fc, true);
                                        console.log(searches.savedSearches[i].url);
                                        c++;
                                        cachedSearches[searches.savedSearches[i].id] = searches.savedSearches[i];
                                        if (c == searches.savedSearches.length) {
                                            console.log("Sales Naviagator: ", "Saved searches length " + searches.savedSearches.length);
                                            callback(searches.savedSearches);
                                        }
                                    }).fail(function() {
                                        return callback(null);
                                    });
                                    //searches.savedSearches[i].url = "https://www.linkedin.com/sales/search?=&savedSearchId=" + searches.savedSearches[i].id + "&resetFacets=false&defaultSelection=noOverride&EL=auto";
                                }
                            }).fail(function() {
                                return callback(null);
                            });
                        } else {
                            c++;
                            searches.savedSearches[i] = cachedSearches[searches.savedSearches[i].id];
                            if (c == searches.savedSearches.length) {
                                return callback(searches.savedSearches);
                            }
                        }
                    })(i);
                }
            } else {
                return callback(null);
            }
        });
    }
};

chrome.browserAction.onClicked.addListener(function(tab) {

    chrome.browserAction.setPopup({popup: "login.html"}); 
});