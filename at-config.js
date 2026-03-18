// ***************************************
// config file for at.js lib (1DS Version)
//****************************************************************************

// SET 1DS Variable Name Here:
// var analytics = oneDSAnalytics;  // 1ds Object Name - if your 1ds object is not named "analytics", replace "oneDSAnalytics" with the name of your 1DS Analytics object and uncomment this line

// SET TARGET PROPERTY HERE:
var at_property = "d2c0b5fa-0b04-7c78-cd3b-566e2468cdf5";  // MSFT Consumer Websites


// ***************************************************************************
! function () {
    window.tt_getCookie = function (t) {
        var e = RegExp(t + "[^;]+").exec(document.cookie);
        return decodeURIComponent(e ? e.toString().replace(/^[^=]+./, "") : "")
    }
    var t = tt_getCookie("MC1"),
        e = tt_getCookie("MSFPC");
    function o(t) {
        return t.split("=")[1].slice(0, 32)
    }
    var n = "";
    if ("" != t) n = o(t);
    else if ("" != e) n = o(e);
    if (n.length > 0) var r = n;
    if (n.length > 0 && at_property != "") {
        window.targetPageParams = function () {
            return {
                "mbox3rdPartyId": r,
                "at_property": at_property
            }
        }
    } else if (at_property != "") {
        window.targetPageParams = function () {
            return {
                "at_property": at_property
            }
        }
    }
}();
// ContentSquare functions
function isEmpty(val) { return (val === undefined || val == null || val.length <= 0) ? true : false; } function key(obj) { return Object.keys(obj) .map(function(k) { return k + "" + obj[k]; }) .join(""); } function distinct(arr) { var result = arr.reduce(function(acc, e) { acc[key(e)] = e; return acc;}, {}); return Object.keys(result) .map(function(k) { return result[k]; }); }

// Adobe Analytics data collection / ContentSquare ttMeta Object **DO NOT ALTER**
var tnt_response = "";

document.addEventListener("at-request-succeeded", function (e) {
    if (e.detail.analyticsDetails != undefined) {

        /*** 1DS ***/
        window.check1DS = function (j) { // function to check either 1DS or JSLL
            if (analytics != undefined && typeof analytics.isInitialized == 'function' && analytics.isInitialized()) { // Check for 1DS
                tnt_response = e.detail;

                //ContentUpdate Event with Target Friendly names
                if (e.detail.responseTokens != undefined) { //checks for friendly name data from response tokens
                    console.log("1DS - present with response tokens");

                    //ContentUpdate Event with tnta
                    analytics.captureContentUpdate(
                        {
                            actionType: "A",
                            behavior: "12",
                            content: JSON.stringify({}),
                            pageTags: {
                                tnta: (tnt_response && tnt_response.analyticsDetails[0] ? tnt_response.analyticsDetails[0].payload.tnta : ''), //a4t data payload
                            }
                        }
                    )

                    var tt_activityCount = e.detail.responseTokens.length;
                    for (i = 0; i < tt_activityCount; i++) {
                        //1DS Content Update
                        console.log('1DS - started captureContentCall - i=' + i);
                        analytics.captureContentUpdate(
                            {
                                actionType: "A",
                                behavior: "12",
                                content: JSON.stringify({}),
                                pageTags: {
                                    tnta: '',  // null out tnta to prevent duplicate A4T hits
                                    at_activity_name: (tnt_response && tnt_response.responseTokens[i] ? tnt_response.responseTokens[i]["activity.name"] : ''), //friendly name target activity
                                    at_exp_name: (tnt_response && tnt_response.responseTokens[i] ? tnt_response.responseTokens[i]["experience.name"] : ''), // friendly name target experience
                                    at_activity_id: (tnt_response && tnt_response.responseTokens[i] ? tnt_response.responseTokens[i]["activity.id"] : ''),
                                    at_exp_id: (tnt_response && tnt_response.responseTokens[i] ? tnt_response.responseTokens[i]["experience.id"] : '')
                                }
                            }
                        )
                    }

                    console.log('1DS - completed captureContentCall');
                    // ttMETA object set for ContentSquare pickup
                    window.ttMETA = typeof(window.ttMETA) != "undefined" ? window.ttMETA : []; var tokens = e.detail.responseTokens; if (isEmpty(tokens)) { return; } var uniqueTokens = distinct(tokens); uniqueTokens.forEach(function(token) { window.ttMETA.push({ 'CampaignName': token["activity.name"], 'CampaignId': token["activity.id"], 'RecipeName': token["experience.name"], 'RecipeId': token["experience.id"], 'OfferId': token["option.id"], 'OfferName': token["option.name"] }); });
                } else {
                    console.log("1DS - present, no response tokens");
                }

            } else {
                console.log('1DS - looping 1DS check');
                if(j < 40) {
                    j++;
                    setTimeout(function(){check1DS(j)}, 250);
                    console.log('1DS - looping 1DS check - loop j=' + j);
                }
            }
        };
        check1DS(1);
        /*** /1DS ***/

    }

});
// Data Providers Example (uncomment and complete setup for data ingestion from 3rd party sources).
// Can be used to augment the data payload sent to the Target edge network including dataLayer and
// on-page data. If not wanted, delete all below commented code from your config file.


 // UNCOMMENT IF USING DATA PROVIDERS
 /*

      // 3rd Party Data via API
        var demandbaseDataProvider = {
          name: "demandbase",
          version: "1.0.0",
          timeout: 1000,
          provider: function(callback) {
            $.ajax({
                type: "GET",
                  url: "https://api.company-target.com/api/v2/ip.json?key=70aff8023e038d56ea636f68e5c5922b",
                dataType: "json",
                success: function(response) {
                  console.log("DemandBase Response: ", response);
                  callback(null, {
                    'profile.db_aud': response.audience,
                    'profile.db_audseg':response.audience_segment
                  });
                },
                error: function(err) {
                  console.log("Error", err);
                  callback(err);
                }
              });

            }
          };

        // 1st Party Data via dataLayer Object:
         var datalayerProvider = {
           name: "dataLayer",
           version: "1.0.0",
           timeout: 1000,
           provider: function(callback) {
             function getDataLayer () {
               if (typeof digitalData != "undefined" || typeof digitalData != null) {
                 callback(null, {
                   'profile.loyaltyStatus': digitalData.customer.loyaltyStatus, // profile. prefixes append attributes to a user profile
                   'profile.purchases': digitalData.customer.purchases,
                   'profile.valueTier': digitalData.customer.valueTier,
                   'profile.persona': digitalData.customer.persona,
                   'pageType': digitalData.page.type, // un-prefixed keys are just mbox parameters meant for non-user based data
                   'productType':digitalData.page.product
                 });
               } else if (i < 100) {
                 setTimeout(function(){
                   getDataLayer();
                   i++;
                 },100)
               }
             }
             getDataLayer();
           }
         };
 */
 // UNCOMMENT IF USING DATA PROVIDERS

// DO NOT EDIT TARGET GLOBAL SETTINGS UNLESS YOU GET MARTECH APPROVAL
window.targetGlobalSettings = {
  deviceIdLifetime: 3.418e10,
  analyticsLogging: "client_side",
  overrideMboxEdgeServer: false,
  allowHighEntropyClientHints: true,
  // UNCOMMENT IF USING DATA PROVIDERS
  /*dataProviders: [
    demandbaseDataProvider,
    datalayerProvider
  ]*/
  // UNCOMMENT IF USING DATA PROVIDERS
};