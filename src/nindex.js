// IMPORTS
// first parser import
const bibTeXParse = require('bibtex-parse-js');
// second parser import
const Cite = require('citation-js');
// remove accents
const removeAccents = require('remove-accents');
const $ = require('jquery');

// CONSTANTS
const INPUT_FILENAME = "https://sites.usc.edu/resl/files/2019/11/sample.bib";
const NO_YEAR = "Others";
const TITLE = "title";
const AUTHOR = "author";
const BOOKTITLE = "booktitle";
const CONTAINER_TITLE = "container-title"
const YEAR = "year";
const STATUS = "status";
const TYPE = "type"
const CITATION_JS = "citationjs"
const BIBTEX_PARSE_JS = "bibtexparsejs"

/**
 * Takes a json object and returns a json object with lowercased keys.
 * @param {object} jsonInput Object
 * @returns {object} Object with lowercase keys
 */
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
    return jsonInput;
}

/**
 * Takes a BibTeX JSON parsed by bibtex-parse-js and returns a string of BibTeX for the ojbect.
 * @param {object} bibtexParseJSON BibTeX JSON object
 * @returns {string} BibTeX string
 */
function getBibTeXStringFromBibtexParseJSON(bibtexParseJSON) {
    let bibtexString = '';
    bibtexString += '@' + bibtexParseJSON.entrytype + '{';
    bibtexString += bibtexParseJSON.citationkey + ',';
    for (let key in bibtexParseJSON.entrytags) {
        value = bibtexParseJSON.entrytags[key];
        bibtexString += "    " + key + "=" + '{' + value + "}," ;
    }
    bibtexString += '}';
    return bibtexString;
}

function getBibTeXStringFromBibtexParseJSONArray(bibtexParseJSONArray) {
    let bibtexString = '';
    for (let index = 0; index < bibtexParseJSONArray.length; index++) {
        bibtexParseJSON = bibtexParseJSONArray[index]
        bibtexString += '@' + bibtexParseJSON.entrytype + '{';
        bibtexString += bibtexParseJSON.citationkey + ',\n';
        for (let key in bibtexParseJSON.entrytags) {
            value = bibtexParseJSON.entrytags[key];
            bibtexString += "    " + key + "=" + '{' + value + "},\n" ;
        }
        bibtexString += '}\n';
    }
    return bibtexString;
}

function getCombinedParsedData(bibtexParseJSData) {
    let combinedParsedData = [];
    let citeOptions = {
        type: 'json'
    };
    for (let index = 0; index < bibtexParseJSData.length; index++) {
        // options for citation-js get() method
        let combinedDataElement = {};
        let bibTeXParseElement = bibtexParseJSData[index];
        let cite = new Cite(getBibTeXStringFromBibtexParseJSON(bibTeXParseElement));
        // get the citation-js data and then get the element
        let citationJSParsedElement = cite.get(citeOptions);
        combinedDataElement[CITATION_JS] = citationJSParsedElement[0];
        combinedDataElement[BIBTEX_PARSE_JS] = bibTeXParseElement;
        combinedParsedData.push(combinedDataElement);
    }
    return combinedParsedData
}
/**
 * 
 * @param {Array} familyNames 
 * @param {Array} givenNames 
 * @param {Array} combinedParsedData 
 */
function getPublications(familyNames, givenNames, combinedParsedData) {
    let publications = [];
    for (let index = 0; index < combinedParsedData.length; index++) {
        let combinedDataElement = combinedParsedData[index];
        let citationJSElement = combinedDataElement[CITATION_JS];
        let bibTeXParseElement = combinedDataElement[BIBTEX_PARSE_JS];
        let matchFound = false;
        let authors = citationJSElement.author;
        if (authors != undefined) {
            for (let f = 0; f < familyNames.length; f++) {
                familyName = familyNames[f];
                for (let g = 0; g < givenNames.length; g++) {
                    givenName = givenNames[g];
                    for (let a = 0; a < authors.length; a++) {
                        author = authors[a];
                        if (author.given != undefined 
                            && removeAccents(author.given).toLowerCase() == givenName.toLowerCase() 
                            && author.family != undefined 
                            && removeAccents(author.family).toLowerCase() == familyName.toLowerCase()) {
                            publications.push(combinedDataElement);
                            matchFound = true;
                        }
                        if (matchFound) {
                            break;
                        }
                    }
                    if (matchFound) {
                        break;
                    }
                }
                if (matchFound) {
                    break;
                }
            }   
        }
    }
    return publications;
}

/**
 * Returns an object grouped by year using the parsed bibtex-parse-js data.
 * @param {Array} bibtexParseJSData Array of parsed BibTeX data
 * @param {boolean} includeUnderReview Should include papers under-review?
 * @param {boolean} includeAccepted Should include published papers?
 * @returns {object} Parsed data grouped by year
 */
function groupByYear(bibtexParseJSData, includeUnderReview, includeAccepted) {
    let bibTeXDataGroupedByYear = {};

    for (let index = 0; index < bibtexParseJSData.length; index++) {
        const element = bibtexParseJSData[index];

        // parse on the new BibTeX string object using citation-js
        let cite = new Cite(getBibTeXStringFromBibtexParseJSON(element))

        // options for citation-js get() method
        let citeOptions = {
            type: 'json'
        }

        // get the citation-js data and then get the element
        let citationJSData = cite.get(citeOptions)
        let citationJSElement = citationJSData[0]
        
        // hold the entrytags of bibtex-parse-js data
        let entrytags = element.entrytags

        // handle under-review and accepted papers
        if (entrytags.status != undefined) {
            // do not include under-review papers if includeUnderReview is false
            if (!includeUnderReview && entrytags.status == "under-review") {
                continue;
            }

            // do not include accepted papers if includeAccepted is false
            if (!includeAccepted && entrytags.status == "accepted") {
                continue;
            }
        }
        // handle cases where year is not defined
        if (entrytags.year == undefined) {
            // create NO_YEAR key if not defined
            if (bibTeXDataGroupedByYear[NO_YEAR] == undefined) {
                bibTeXDataGroupedByYear[NO_YEAR] = [];
            }

            // initializing citation object
            let citation = {}
            // add a title to citation object
            if (citationJSElement.title != undefined) {
                citation[TITLE] = citationJSElement.title;
            } else {
                citation[TITLE] = entrytags.title
            }

            // add the author(s) to citation object
            if (citationJSElement.author != undefined) {
                citation[AUTHOR] = citationJSElement.author;
            } else if (citationJSElement.editor != undefined) {
                citation[AUTHOR] = citationJSElement.editor;
            } else {
                citation[AUTHOR] = entrytags.author
            }

            // add the book title to citation object
            if (citationJSElement[CONTAINER_TITLE] != undefined) {
                citation[BOOKTITLE] = citationJSElement[CONTAINER_TITLE];
            } else {
                citation[BOOKTITLE] = entrytags.booktitle
            }
            
            // add the status to citation object if present
            if (entrytags.status != undefined) {
                citation[STATUS] = entrytags.status;
            }

            // add the type to citation object if present
            if (entrytags.type != undefined) {
                citation[TYPE] = entrytags.type;
            }

            bibTeXDataGroupedByYear[NO_YEAR].push(citation);
        } else {
            // create a year if it does not exist
            if (bibTeXDataGroupedByYear[entrytags.year] == undefined) {
                bibTeXDataGroupedByYear[entrytags.year] = [];
            }

            // initializing citation object
            let citation = {}
            // add a title to citation object
            if (citationJSElement.title != undefined) {
                citation[TITLE] = citationJSElement.title;
            } else {
                citation[TITLE] = entrytags.title
            }

            // add the author(s) to citation object
            if (citationJSElement.author != undefined) {
                citation[AUTHOR] = citationJSElement.author;
            } else if (citationJSElement.editor != undefined) {
                citation[AUTHOR] = citationJSElement.editor;
            } else {
                citation[AUTHOR] = entrytags.author
            }

            // add the book title to citation object
            if (citationJSElement[CONTAINER_TITLE] != undefined) {
                citation[BOOKTITLE] = citationJSElement[CONTAINER_TITLE];
            } else {
                citation[BOOKTITLE] = entrytags.booktitle
            }

            // add the year to citation object if present
            if (entrytags.year != undefined) {
                citation[YEAR] = entrytags.year;
            }

            // add the status to citation object if present
            if (entrytags.status != undefined) {
                citation[STATUS] = entrytags.status;
            }

            // add the type to citation object if present
            if (entrytags.type != undefined) {
                citation[TYPE] = entrytags.type;
            }

            bibTeXDataGroupedByYear[entrytags.year].push(citation);
        }
    }

    return bibTeXDataGroupedByYear;
}

/**
 * Loads the parsed content into the div on the website.
 * @param {object} contentData Parsed BibTeX content
 */
function loadBibTeXContentDiv(contentData) {
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

/**
 * Function to handle the XMLHttpRequest called by readBibTeXDB function.
 */
function handler() {
    if (this.readyState === 4) {
        if (this.status === 200 || this.status == 0) {
            let allText = this.responseText;
            // parse the file text
            let parsedBibTeX = bibTeXParse.toJSON(allText);
            
            // convert all keys to lowercase to enable ease of access
            let lowerCaseKeysParsedBibTeX = convertKeysToLowerCase(parsedBibTeX);
            console.log(lowerCaseKeysParsedBibTeX);
            
            let combinedParsedData = getCombinedParsedData(lowerCaseKeysParsedBibTeX);
            console.log(combinedParsedData);

            // group the data by year
            let bibTeXDataGroupedByYear = groupByYear(lowerCaseKeysParsedBibTeX, true, true);
            console.log(bibTeXDataGroupedByYear);

            let publications = getPublications(["heiden"], ["eric"], combinedParsedData);
            console.log(publications);
            
            // load the parsed and grouped content into a div on the page
            loadBibTeXContentDiv(bibTeXDataGroupedByYear);         
        }
    }
}

/**
 * Reads a BibTeX file (.bib) and parses it to produce result for the webpage.
 * @param {string} filename Filename string
 */
function readBibTeXDB(filename) {
    let inputFile = new XMLHttpRequest();
    inputFile.open("GET", filename);
    inputFile.onload = handler;
    inputFile.send();
}

function publicationHandler(familyNames, givenNames) {
    if (this.readyState === 4) {
        if (this.status === 200 || this.status == 0) {
            let allText = this.responseText;
            // parse the file text
            let parsedBibTeX = bibTeXParse.toJSON(allText);
            
            // convert all keys to lowercase to enable ease of access
            let lowerCaseKeysParsedBibTeX = convertKeysToLowerCase(parsedBibTeX);
            console.log(lowerCaseKeysParsedBibTeX);
            
            let combinedParsedData = getCombinedParsedData(lowerCaseKeysParsedBibTeX);
            console.log(combinedParsedData);

            // group the data by year
            // let bibTeXDataGroupedByYear = groupByYear(lowerCaseKeysParsedBibTeX, true, true);
            // console.log(bibTeXDataGroupedByYear);

            let publications = getPublications(familyNames, givenNames, combinedParsedData);
            console.log(publications);
            
            // load the parsed and grouped content into a div on the page
            // loadBibTeXContentDiv(bibTeXDataGroupedByYear);       
        }
    }
}

function readAndLoadBibtexDB(familyNames, givenNames, filename) {
    let inputFile = new XMLHttpRequest();
    inputFile.open("GET", filename);
    inputFile.onload = () => {
        console.log(this.readyState);
        publicationHandler(familyNames, givenNames);
    }
    inputFile.send();
}

function getPublicationsFor(familyNames, givenNames, filename) {
    readAndLoadBibtexDB(familyNames, givenNames, filename)
}

window.onload = () => {
    readBibTeXDB(INPUT_FILENAME);
    // getPublicationsFor(["heiden"], ["eric"], INPUT_FILENAME);
}