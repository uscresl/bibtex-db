// IMPORTS
// first parser import
const bibTeXParse = require('bibtex-parse-js');
// second parser import
const Cite = require('citation-js');
// remove accents
const removeAccents = require('remove-accents');

/**
 * todo: Complete the following flows:
 * 1. parseBibTeX using bibtex-parse-js. [DONE]
 * 2. Convert keys to lowercase. [DONE]
 * 2. Combine parsed data with citation-js data. [DONE]
 * 3. If author's view then filter the author's citation else do nothing. [DONE-1]
 *      --> Take care of non-dropping-particle: "de" [DONE]
 * 4. Group by year and publication type. [DONE]
 * 5. Display the papers by sorting them in descending order of year followed by non-year papers. [IN-PROGRESS]
 * # Also need to take care of professor's view where the `under-review` or `accepted` papers are shown.
 * # Also omit `status` or `type` tags from displayed citation.
 * # Refer: https://www2.cs.arizona.edu/~collberg/Teaching/07.231/BibTeX/bibtex.html for standard tags.
 */

// CONSTANTS
const INPUT_FILENAME = "sample.bib";
// const INPUT_FILENAME = "https://sites.usc.edu/resl/files/2019/11/sample.bib";
const NO_YEAR = "Other";
const TITLE = "title";
const AUTHOR = "author";
const BOOKTITLE = "booktitle";
const CONTAINER_TITLE = "container-title";
const YEAR = "year";
const STATUS = "status";
const TYPE = "type";
const NON_DROPPING_PARTICLE = "non-dropping-particle";
const CITATION_JS = "citationjs";
const BIBTEX_PARSE_JS = "bibtexparsejs";

const JOURNAL = "journal";
const BOOK = "book";
const CONFERENCE = "conference";
const TECH_REPORT = "techreport";
const MASTERS_THESIS = "mastersthesis";
const PHD_THESIS = "phdthesis";
const UNDER_REVIEW = "under-review";
const WORKSHOP = "workshop";
const ABSTRACT = "abstract";
const PREPRINT = "preprint";
const ACCEPTED = "accepted";

const CATEGORY_HEADINGS = {
    "journal": "Journal Papers",
    "book": "Books",
    "workshop": "Workshop Articles",
    "abstract": "Abstracts",
    "preprint": "Preprints",
    "conference": "Conference Papers",
    "techreport": "Tech Reports",
    "mastersthesis": "Master's Thesis",
    "phdthesis": "Ph.D. Thesis",
    "under-review": "Under Review",
    "accepted": "Accepted"
};

const CATEGORY_MAPPING = {
    "article": "journal",
    "book": "book",
    "booklet": "book",
    "conference": "conference",
    "inbook": "book",
    "incollection": "conference",
    "inproceedings": "conference",
    "manual": "techreport",
    "mastersthesis": "mastersthesis",
    "misc": "conference", // Assumption
    "phdthesis": "phdthesis",
    "proceedings": "conference",
    "techreport": "techreport",
    "unpublished": "under-review",
    "workshop": "workshop",
    "abstract": "abstract",
    "preprint": "preprint"
}

const CATEGORY_ORDERING = [PHD_THESIS, MASTERS_THESIS, JOURNAL, BOOK, CONFERENCE, WORKSHOP, ABSTRACT, PREPRINT, 
                            TECH_REPORT];

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
                let familyName = familyNames[f];
                for (let g = 0; g < givenNames.length; g++) {
                    let givenName = givenNames[g];
                    for (let a = 0; a < authors.length; a++) {
                        author = authors[a];
                        let authorGivenName = author.given;
                        let authorFamilyName = author.family;
                        let authorLiteral = author.literal;
                        if (author[NON_DROPPING_PARTICLE] != undefined) {
                            authorFamilyName += author[NON_DROPPING_PARTICLE] + " " + authorFamilyName;
                        }
                        if (authorGivenName != undefined 
                            && removeAccents(authorGivenName).toLowerCase() == givenName.toLowerCase() 
                            && authorFamilyName != undefined 
                            && removeAccents(authorFamilyName).toLowerCase() == familyName.toLowerCase()) {
                            // Comparison with given and family name.
                            publications.push(combinedDataElement);
                            matchFound = true;
                        } else if (authorGivenName == undefined 
                            && authorFamilyName != undefined
                            && removeAccents(authorFamilyName).toLowerCase() == familyName.toLowerCase()) {
                            // If the author only has a family name and no given name, it will be counted as a family
                            // name and hence the comparison with family name.
                            publications.push(combinedDataElement);
                            matchFound = true; 
                        } else if (authorGivenName != undefined 
                            && removeAccents(authorGivenName).toLowerCase() == familyName.toLowerCase() 
                            && authorFamilyName == undefined) {
                            // If the author only has a given name and no family name, it will be counted as a family
                            // name and hence the comparison with family name.
                            publications.push(combinedDataElement);
                            matchFound = true;
                        } else if (authorLiteral != undefined) {
                            processedAuthorLiteral = removeAccents(authorLiteral).toLowerCase();
                            // (X) DOUBT.
                            // to be implemented.
                            // occurs only when authors are not formatted properly.
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

function groupPublicationsByYearAndType(parsedPublications, includeUnderReview) {
    let publicationsGroupedByYearAndType = {};
    for (let index = 0; index < parsedPublications.length; index++) {
        let publication = parsedPublications[index]
        let bibTeXParseElement = publication[BIBTEX_PARSE_JS];
        let bibTeXParseEntryTags = bibTeXParseElement.entrytags;
        // let citationsJSElement = publication[CITATION_JS];
        
        // Check if under-review or accepted papers are to be included
        if (bibTeXParseEntryTags.status != undefined) {
            let status = bibTeXParseEntryTags.status;
            if (!includeUnderReview && status == UNDER_REVIEW) {
                continue;
            }
        }

        let year = "";
        if (bibTeXParseEntryTags.year == undefined) {
            year = NO_YEAR;
        } else {
            year = bibTeXParseEntryTags.year
        }

        if (publicationsGroupedByYearAndType[year] == undefined) {
            publicationsGroupedByYearAndType[year] = {}
        }

        let entrytype = ""
        if (bibTeXParseEntryTags.type == undefined) {
            // Find the type of the publication.
            if (bibTeXParseElement.entrytype == undefined) {
                // default: CONFERENCE.
                entrytype = CONFERENCE;
            } else {
                if (CATEGORY_MAPPING[bibTeXParseElement.entrytype.toLowerCase()] == undefined) {
                    // default: CONFERENCE.
                    entrytype = CONFERENCE;
                } else {
                    // assign the type if it's present in the CATEGORY_MAPPING.
                    entrytype = CATEGORY_MAPPING[bibTeXParseElement.entrytype.toLowerCase()];
                }
            }
        } else {
            // if a field 'type' tag is provided, it overrides the entrytype.
            if (CATEGORY_MAPPING[bibTeXParseEntryTags.type.toLowerCase()] == undefined) {
                // default: CONFERENCE.
                entrytype = CONFERENCE;
            } else {
                // assign the type if it's present in the CATEGORY_MAPPING.
                entrytype = CATEGORY_MAPPING[bibTeXParseEntryTags.type.toLowerCase()];
            }
        }

        if (publicationsGroupedByYearAndType[year][entrytype] == undefined) {
            publicationsGroupedByYearAndType[year][entrytype] = [];
        }

        publicationsGroupedByYearAndType[year][entrytype].push(publication);
    }
    return publicationsGroupedByYearAndType;
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
            let citation = {};
            citation["combined"] = {"bibtexparsejs": element, "citationjs": citationJSElement};
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
            citation["combined"] = {"bibtexparsejs": element, "citationjs": citationJSElement};
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

function getCitationContent(bibTeXParseJSElement) {
    let citationContent = '';
    citationContent += '@' + bibTeXParseJSElement.entrytype.toLowerCase() + '{';
    citationContent += bibTeXParseJSElement.citationkey + ',';
    for (let key in bibTeXParseJSElement.entrytags) {
        value = bibTeXParseJSElement.entrytags[key];
        citationContent += "<br>&nbsp;&nbsp;&nbsp;&nbsp;" + key + "=" + '{' + value + "}," ;
    }
    citationContent += '<br>}';
    return citationContent;
}

function getReversedSortedKeys(object) {
    let keys = [];
    for (let key in object) {
        keys.push(key);
    }
    keys.sort();
    return keys.reverse();
}

function loadBibTeXContentDivFromData(publicationsGroupedByYearAndType) {
    let others = undefined;

    let reversedKeys = getReversedSortedKeys(publicationsGroupedByYearAndType);
    for (let index = 0; index < reversedKeys.length; index++) {
        let contentString = "";
        let year = reversedKeys[index];
        
        contentString += `<h2>${year}</h2>`;
        let publicationsForYear = publicationsGroupedByYearAndType[year];
        for (let categoryIndex = 0; categoryIndex < CATEGORY_ORDERING.length; categoryIndex++) {
            let category = CATEGORY_ORDERING[categoryIndex];
            if (publicationsForYear[category] != undefined) {
                let categoryHeading = CATEGORY_HEADINGS[category];
                contentString += `<h3>&nbsp;&nbsp;${categoryHeading}</h3>`;

                contentString += `<ul>`;
                let publicationsForCategory = publicationsForYear[category];
                for (let publicationIndex = 0; publicationIndex < publicationsForCategory.length; publicationIndex++) {
                    contentString += `<li>`;
                    
                    publication = publicationsForCategory[publicationIndex];
                    
                    let bibTeXParseJSElement = publication[BIBTEX_PARSE_JS];
                    let bibTeXParseEntryTags = bibTeXParseJSElement.entrytags;
                    let citationJSElement = publication[CITATION_JS];
                    
                    // Authors are handled below.
                    let citationJSAuthors = citationJSElement[AUTHOR];
                    let bibTeXParseJSAuthors = bibTeXParseEntryTags[AUTHOR];
                    if (citationJSAuthors != undefined) {
                        for (let authorIndex = 0; authorIndex < citationJSAuthors.length; authorIndex++) {
                            let author = citationJSAuthors[authorIndex];
                            if (authorIndex == citationJSAuthors.length - 1 && citationJSAuthors.length > 1) {
                                contentString = contentString.substring(0, contentString.length - 2);
                                contentString += ` and `;
                            }
                            if (author.literal == undefined) {
                                if (author.given != undefined && author.family != undefined) {
                                    if (author[NON_DROPPING_PARTICLE] != undefined) {
                                        contentString += `${author.given} ${author[NON_DROPPING_PARTICLE]} 
                                                            ${author.family}, `;
                                    } else {
                                        contentString += `${author.given} ${author.family}, `;
                                    }
                                    
                                } else if (author.given != undefined) {
                                    contentString += `${author.given}, `;
                                } else if (author.family != undefined) {
                                    if (author[NON_DROPPING_PARTICLE] != undefined) {
                                        contentString += `${author[NON_DROPPING_PARTICLE]} ${author.family}, `;
                                    } else {
                                        contentString += `${author.family}, `;
                                    }
                                }
                            } else {
                                contentString += `${author.literal}, `;
                            }
                        }
                    } else if (bibTeXParseJSAuthors != undefined) {
                        contentString += `${bibTeXParseJSAuthors}, `;
                    }

                    // Title is handled below.
                    if (citationJSElement[TITLE] != undefined) {
                        contentString += `${citationJSElement[TITLE]}, `;
                    } else if (bibTeXParseEntryTags[TITLE] != undefined) {
                        contentString += `${bibTeXParseEntryTags[TITLE]}, `;
                    }

                    // Conference/journal name is handled below.
                    if (citationJSElement[CONTAINER_TITLE] != undefined) {
                        if (bibTeXParseEntryTags[STATUS] != undefined && bibTeXParseEntryTags[STATUS] == UNDER_REVIEW) {
                            contentString += `Under review at `;
                        } else {
                            contentString += `In `;
                        }
                        contentString += `${citationJSElement[CONTAINER_TITLE]}, `;
                    } else if (bibTeXParseEntryTags[JOURNAL] != undefined) {
                        if (bibTeXParseEntryTags[STATUS] != undefined && bibTeXParseEntryTags[STATUS] == UNDER_REVIEW) {
                            contentString += `Under review at `;
                        } else {
                            contentString += `In `;
                        }
                        contentString += `${bibTeXParseEntryTags[JOURNAL]}, `;
                    }

                    // Year is handled here.
                    if (bibTeXParseEntryTags[YEAR] != undefined) {
                        contentString += `${bibTeXParseEntryTags[YEAR]}, `;
                    }

                    contentString = contentString.substring(0, contentString.length - 2);
                    contentString += `.`;
                    contentString += `</li>`;
                }
                contentString += `</ul>`
            }
        }
        // handle the case of other publications after all the years
        if (year == NO_YEAR) {
            others = contentString;
        } else {
            $(".bibtex-content").append(contentString);
        }
    }
    if (others != undefined) {
        $(".bibtex-content").append(others);
    }
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

            if (element.booktitle != undefined) {
                contentString += "In " + element.booktitle + ", ";
            }

            if (element.year != undefined) {
                contentString += element.year + ", ";
            }

            if (element.status != undefined) {
                contentString += element.status + ", ";
            }
            
            contentString = contentString.substring(0, contentString.length - 2);
            contentString += ".";
            let bibTeXParseElement = element["combined"]["bibtexparsejs"];
            let citationKey = bibTeXParseElement.citationkey 
                                + Math.random().toString(36).substring(2,15);
            contentString += `<button style="background-color: #880000; margin-left: 1vw;
                                                    padding-left: 15px; padding-right: 15px;
                                                    color: white; border: none; border-radius: 5px;"
                                id="button-${citationKey}"
                                class="button-${citationKey}">Show Citation</button>`;
            contentString += `<div id="citation-${citationKey}"
                                class="citation-${citationKey}"
                                style="background-color: #e8e8e8; padding: 5px; margin: 5px; color: black;
                                        border-radius: 5px; font-size: 11px; display: none;
                                        font-family: 'Courier New', Courier, monospace;">
                                    ${getCitationContent(bibTeXParseElement)}
                                </div>`;
            contentString += "</div>";
            contentString += ""
            contentString += `<script>
                                    $(".button-${citationKey}").click(() => {
                                        $(".citation-${citationKey}").toggle();
                                        if ($(".citation-${citationKey}").is(":visible")) {
                                            $(".button-${citationKey}").html("Hide Citation");
                                        } else {
                                            $(".button-${citationKey}").html("Show Citation");
                                        }
                                    });
                                </script>`
                contentString += "</li>";
        });
        contentString += "</ul>";
        $(".bibtex-content").append(contentString);
    }
}

function loadBibTeXContentDivFiltered(publications, familyNames, givenNames) {
    contentString = "<hr><h2>Filtered for Family Names: " + JSON.stringify(familyNames) 
                    + " and Given Names: " + JSON.stringify(givenNames) 
                    + ":</h2>";
    contentString += "<ul>";
    for (let index = 0; index < publications.length; index++) {
        contentString += "<li>"
        let bibTeXParseElement = publications[index][BIBTEX_PARSE_JS];
        let bibTeXParseEntryTags = bibTeXParseElement.entrytags;
        let citationsJSElement = publications[index][CITATION_JS];

        if (citationsJSElement.author != undefined) {
            if (Array.isArray(citationsJSElement.author)) {
                citationsJSElement.author.forEach((author, index) => {
                    if (citationsJSElement.author.length > 1 && (index == citationsJSElement.author.length - 1)) {
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
                contentString += citationsJSElement.author + ", "
            }
        }

        if (citationsJSElement.title != undefined) {
            contentString += citationsJSElement.title + ", ";
        }

        if (citationsJSElement[CONTAINER_TITLE] != undefined) {
            contentString += "In " + citationsJSElement[CONTAINER_TITLE] + ", ";
        }

        if (bibTeXParseEntryTags.year != undefined) {
            contentString += bibTeXParseEntryTags.year + ", ";
        }

        if (bibTeXParseEntryTags.status != undefined) {
            contentString += bibTeXParseEntryTags.status + ", ";
        }
        
        contentString = contentString.substring(0, contentString.length - 2);
        contentString += ".";
        let citationKey = bibTeXParseElement.citationkey 
                                + Math.random().toString(36).substring(2,15);
        contentString += `<button style="background-color: #880000; margin-left: 1vw;
                                                padding-left: 15px; padding-right: 15px;
                                                color: white; border: none; border-radius: 5px;"
                            id="button-${citationKey}"
                            class="button-${citationKey}">Show Citation</button>`;
        contentString += `<div id="citation-${citationKey}"
                            class="citation-${citationKey}"
                            style="background-color: #e8e8e8; padding: 5px; margin: 5px; color: black;
                                        border-radius: 5px; font-size: 11px; display: none;
                                        font-family: 'Courier New', Courier, monospace;">
                                ${getCitationContent(bibTeXParseElement)}
                            </div>`;
        contentString += "</div>";
        contentString += ""
        contentString += `<script>
                                $(".button-${citationKey}").click(() => {
                                    $(".citation-${citationKey}").toggle();
                                    if ($(".citation-${citationKey}").is(":visible")) {
                                        $(".button-${citationKey}").html("Hide Citation");
                                    } else {
                                        $(".button-${citationKey}").html("Show Citation");
                                    }
                                });
                            </script>`
        contentString += "</li>"
    }
    contentString += "</ul>";
    $(".bibtex-content").append(contentString);
}

function readAndLoadBibtexDB(familyNames, givenNames, filename) {
    fetch(filename).then((response) => {
        response.text().then((allText) => {
            try {
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
                
                let bibTeXDataGroupedByYearAndType = groupPublicationsByYearAndType(combinedParsedData, true);
                console.log(bibTeXDataGroupedByYearAndType);
                console.log(getReversedSortedKeys(bibTeXDataGroupedByYearAndType));

                // load the parsed and grouped content into a div on the page
                // loadBibTeXContentDiv(bibTeXDataGroupedByYear);
                loadBibTeXContentDivFromData(bibTeXDataGroupedByYearAndType);

                let publications = getPublications(familyNames, givenNames, combinedParsedData);
                console.log(publications);
                let publicationsGroupedByYearAndType = groupPublicationsByYearAndType(publications);
                loadBibTeXContentDivFromData(publicationsGroupedByYearAndType);
                // loadBibTeXContentDivFiltered(publications, familyNames, givenNames);
            } catch (error) {
                console.log(error);
                $(".bibtex-content").append("BibTeX file parsing or internal error.");
            }
        })
    })
}

function getPublicationsFor(familyNames, givenNames, filename) {
    readAndLoadBibtexDB(familyNames, givenNames, filename)
}

window.getPublicationsFor = getPublicationsFor;
