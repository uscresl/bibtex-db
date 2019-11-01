// imports
const bibTeXParse = require('bibtex-parse-js');
const Cite = require('citation-js');
const $ = require('jquery');

// constants
const INPUT_FILE_NAME = "test.bib";
const NO_YEAR = "Others";
const TITLE = "title";
const AUTHOR = "author";
const BOOKTITLE = "booktitle";
const YEAR = "year";
const STATUS = "status";
const TYPE = "type"

// creating object for citation.js
let cite = new Cite()
let opt = {
    type: 'json'
}
let parseAsync = Cite.inputAsync

function convertKeysToLowerCase(jsonInput) {
    if (jsonInput instanceof Array) {
        for (let i in jsonInput) {
            jsonInput[i] = convertKeysToLowerCase(jsonInput[i]);
        }
    }
    if (!typeof(jsonInput) === "object" || typeof(jsonInput) === "string" || typeof(jsonInput) === "number" 
            || typeof(jsonInput) === "boolean") {
        return jsonInput;
    }
    let keys = Object.keys(jsonInput);
    let n = keys.length;
    let lowKey;
    while (n--) {
        let key = keys[n];
        if (key === (lowKey = key.toLowerCase()))
            continue;
        jsonInput[lowKey] = convertKeysToLowerCase(jsonInput[key]);
        delete jsonInput[key];
    }
    return (jsonInput);
}

function groupByYear(bibtexParseJSData, citationJSData, includeUnderReview, includeAccepted) {
    let bibTeXDataGroupedByYear = {};

    // bibtexParseJSData.forEach((element, index) => {
    for (let index = 0; index < bibtexParseJSData.length; index++) {
        const element = bibtexParseJSData[index];
        let entrytags = element.entrytags
        if (entrytags.status != undefined) {
            if (!includeUnderReview && entrytags.status == "under-review") {
                continue;
            }

            if (!includeAccepted && entrytags.status == "accepted") {
                continue;
            }
        }
        // handle cases where year is not defined
        if (entrytags.year == undefined) {
            if (bibTeXDataGroupedByYear[NO_YEAR] == undefined) {
                bibTeXDataGroupedByYear[NO_YEAR] = [];
            }

            let citation = {}
            if (citationJSData[index].title != undefined) {
                citation[TITLE] = citationJSData[index].title;
            } else {
                citation[TITLE] = entrytags.title
            }

            if (citationJSData[index].author != undefined) {
                citation[AUTHOR] = citationJSData[index].author;
            } else if (citationJSData[index].editor != undefined) {
                citation[AUTHOR] = citationJSData[index].editor;
            } else {
                citation[AUTHOR] = entrytags.author
            }

            if (citationJSData[index]["container-title"] != undefined) {
                citation[BOOKTITLE] = citationJSData[index]["container-title"];
            } else {
                citation[BOOKTITLE] = entrytags.booktitle
            }

            if (entrytags.status != undefined) {
                citation[STATUS] = entrytags.status;
            }

            if (entrytags.type != undefined) {
                citation[TYPE] = entrytags.type;
            }

            bibTeXDataGroupedByYear[NO_YEAR].push(citation);
        } else {
            // create a year if it does not exist
            if (bibTeXDataGroupedByYear[entrytags.year] == undefined) {
                bibTeXDataGroupedByYear[entrytags.year] = [];
            }

            let citation = {}
            if (citationJSData[index].title != undefined) {
                citation[TITLE] = citationJSData[index].title;
            } else {
                citation[TITLE] = entrytags.title
            }

            if (citationJSData[index].author != undefined) {
                citation[AUTHOR] = citationJSData[index].author;
            } else if (citationJSData[index].editor != undefined) {
                citation[AUTHOR] = citationJSData[index].editor;
            } else {
                citation[AUTHOR] = entrytags.author
            }

            if (citationJSData[index]["container-title"] != undefined) {
                citation[BOOKTITLE] = citationJSData[index]["container-title"];
            } else {
                citation[BOOKTITLE] = entrytags.booktitle
            }

            if (entrytags.year != undefined) {
                citation[YEAR] = entrytags.year;
            }

            if (entrytags.status != undefined) {
                citation[STATUS] = entrytags.status;
            }

            if (entrytags.type != undefined) {
                citation[TYPE] = entrytags.type;
            }

            // console.log(entrytags, citationJSData[index], citation);
            bibTeXDataGroupedByYear[entrytags.year].push(citation);
        }
    }

    return bibTeXDataGroupedByYear;
}

function prepareBibTeXContentDiv(contentData) {
    for (year in contentData) {
        contentString = "";
        contentString += "<h2>" + year + "</h2>";
        contentString += "<ul>";
        contentData[year].forEach(element => {
            contentString += "<li>";
            if (element.author != undefined) {
                if (Array.isArray(element.author)) {
                    element.author.forEach((author, index) => {
                        if (element.author.length > 1 && (index == element.author.length - 1)) {
                            contentString = contentString.substring(0, contentString.length - 2);
                            contentString += " and ";
                        }

                        if (author.given != undefined || author.family != undefined) {
                            if (author.given != undefined) {
                                contentString += author.given + " ";
                            }
                            if (author.family != undefined) {
                                contentString += author.family;
                            }
                            contentString += ", ";
                        } else {
                            if (author.literal != undefined) {
                                contentString += author.literal + ", ";
                            }
                        }
                    });
                } else {
                    contentString += element.author + ", "
                }
            }

            if (element.title != undefined) {
                contentString += element.title + ", ";
            }

            if (element.year != undefined) {
                contentString += element.year + ", ";
            }

            if (element.status != undefined) {
                contentString += element.status + ", ";
            }
            
            contentString = contentString.substring(0, contentString.length - 2);
            contentString += ".";
            contentString += "</li>";
        });
        $(".bibtex-content").append(contentString);
    }
}

function handler() {
    if (this.readyState === 4) {
        if (this.status === 200 || this.status == 0) {
            let allText = this.responseText;
            let parsedBibTeX = bibTeXParse.toJSON(allText);
            parseAsync(allText).then((result) => {
                let lowerCaseKeysParsedBibTeX = convertKeysToLowerCase(parsedBibTeX);
                console.log(lowerCaseKeysParsedBibTeX);

                let citationJSParsedData = cite.set(result).get(opt)
                console.log(citationJSParsedData);
                
                let bibTeXDataGroupedByYear = groupByYear(lowerCaseKeysParsedBibTeX, citationJSParsedData, true, true);
                console.log(bibTeXDataGroupedByYear);
                
                prepareBibTeXContentDiv(bibTeXDataGroupedByYear);
            });
            
        }
    }
}

function readBibTeXDB(fileName) {
    let inputFile = new XMLHttpRequest();
    inputFile.open("GET", fileName);
    inputFile.onload = handler;
    inputFile.send();
}

window.onload = () => {
    readBibTeXDB(INPUT_FILE_NAME);
}