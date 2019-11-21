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
 * 3. If author's view then filter the author's citation else do nothing. [DONE]
 *      --> Take care of non-dropping-particle: "de" [DONE]
 * 4. Group by year and publication type. [DONE]
 * 5. Display the papers by sorting them in descending order of year followed by non-year papers. [DONE]
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
const EDITOR = "editor";
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
const UNPUBLISHED = "unpublished";
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
 * @param {object} bibtexParseJSON JSON object of BibTeX
 * @returns {string} string form BibTeX
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

/**
 * Combines the bibtex-parse-js data with the corresponding citation-js data
 * @param {Array} bibtexParseJSData Array of parsed BibTeX citations
 * @returns {Array} Array of objects with combined parsed data from both the plugins
 */
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
    return combinedParsedData;
}

/**
 * Gets/filters publications for a given set of author family names and given names.
 * @param {Array} familyNames Array of possible family names of the author
 * @param {Array} givenNames Array of possible given names of the author
 * @param {Array} combinedParsedData Array of objects which include data parsed from bibtex-parse-js and citation-js
 */
function getPublications(familyNames, givenNames, combinedParsedData) {
    let publications = [];
    if (familyNames == undefined || familyNames == []) {
        familyNames = [""];
    }
    if (givenNames == undefined || givenNames == []) {
        givenNames = [""];
    }
    for (let index = 0; index < combinedParsedData.length; index++) {
        let combinedDataElement = combinedParsedData[index];
        let citationJSElement = combinedDataElement[CITATION_JS];
        let bibTeXParseElement = combinedDataElement[BIBTEX_PARSE_JS];
        let matchFound = false;

        // checking if the author belongs to authors array of the parsed data
        let authors = citationJSElement.author;
        if (authors != undefined) {
            for (let f = 0; f < familyNames.length; f++) {
                let familyName = familyNames[f].normalize("NFC");
                for (let g = 0; g < givenNames.length; g++) {
                    let givenName = givenNames[g].normalize("NFC");
                    for (let a = 0; a < authors.length; a++) {
                        author = authors[a];
                        let authorGivenName = author.given;
                        let authorFamilyName = author.family;
                        if (author[NON_DROPPING_PARTICLE] != undefined) {
                            authorFamilyName += author[NON_DROPPING_PARTICLE] + " " + authorFamilyName;
                        }
                        if (authorGivenName != undefined 
                            && removeAccents(authorGivenName.normalize("NFC")).toLowerCase() == givenName.toLowerCase() 
                            && authorFamilyName != undefined 
                            && removeAccents(authorFamilyName.normalize("NFC")).toLowerCase() == familyName.toLowerCase()) {
                            // Comparison with given and family name.
                            publications.push(combinedDataElement);
                            matchFound = true;
                        } else if (authorGivenName == undefined 
                            && authorFamilyName != undefined
                            && removeAccents(authorFamilyName.normalize("NFC")).toLowerCase() == familyName.toLowerCase()) {
                            // If the author only has a family name and no given name, it will be counted as a family
                            // name and hence the comparison with family name.
                            publications.push(combinedDataElement);
                            matchFound = true; 
                        } else if (authorGivenName != undefined 
                            && removeAccents(authorGivenName.normalize("NFC")).toLowerCase() == familyName.toLowerCase() 
                            && authorFamilyName == undefined) {
                            // If the author only has a given name and no family name, it will be counted as a family
                            // name and hence the comparison with family name.
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

        let editors = citationJSElement.editor;
        if (!matchFound) {
            if (editors != undefined) {
                for (let f = 0; f < familyNames.length; f++) {
                    let familyName = familyNames[f].normalize("NFC");
                    for (let g = 0; g < givenNames.length; g++) {
                        let givenName = givenNames[g].normalize("NFC");
                        for (let a = 0; a < editors.length; a++) {
                            editor = editors[a];
                            let editorGivenName = editor.given;
                            let editorFamilyName = editor.family;
                            if (editor[NON_DROPPING_PARTICLE] != undefined) {
                                editorFamilyName += editor[NON_DROPPING_PARTICLE] + " " + editorFamilyName;
                            }
                            if (editorGivenName != undefined 
                                && removeAccents(editorGivenName.normalize("NFC")).toLowerCase() == givenName.toLowerCase() 
                                && editorFamilyName != undefined 
                                && removeAccents(editorFamilyName.normalize("NFC")).toLowerCase() == familyName.toLowerCase()) {
                                // Comparison with given and family name.
                                publications.push(combinedDataElement);
                                matchFound = true;
                            } else if (editorGivenName == undefined 
                                && editorFamilyName != undefined
                                && removeAccents(editorFamilyName.normalize("NFC")).toLowerCase() == familyName.toLowerCase()) {
                                // If the editor only has a family name and no given name, it will be counted as a family
                                // name and hence the comparison with family name.
                                publications.push(combinedDataElement);
                                matchFound = true; 
                            } else if (editorGivenName != undefined 
                                && removeAccents(editorGivenName.normalize("NFC")).toLowerCase() == familyName.toLowerCase() 
                                && editorFamilyName == undefined) {
                                // If the editor only has a given name and no family name, it will be counted as a family
                                // name and hence the comparison with family name.
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
    }
    return publications;
}

function groupPublicationsByYearAndType(parsedPublications, includeUnderReview) {
    let publicationsGroupedByYearAndType = {};
    for (let index = 0; index < parsedPublications.length; index++) {
        let publication = parsedPublications[index];
        let bibTeXParseElement = publication[BIBTEX_PARSE_JS];
        let bibTeXParseEntryTags = bibTeXParseElement.entrytags;
        
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
            year = bibTeXParseEntryTags.year;
        }

        if (publicationsGroupedByYearAndType[year] == undefined) {
            publicationsGroupedByYearAndType[year] = {};
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

function getCitationContent(bibTeXParseJSElement) {
    let citationContent = '';
    citationContent += '@' + bibTeXParseJSElement.entrytype.toLowerCase() + '{';
    citationContent += bibTeXParseJSElement.citationkey + ',';
    for (let key in bibTeXParseJSElement.entrytags) {
        if (key == STATUS || key == TYPE) {
            continue;
        }
        value = bibTeXParseJSElement.entrytags[key];
        citationContent += "<br>&nbsp;&nbsp;&nbsp;&nbsp;" + key + "=" + '{' + value + "}," ;
    }
    citationContent += '<br>}';
    return citationContent;
}

/**
 * Returns a reversely sorted array of object keys
 * @param {Object} object any js object
 * @returns {Array} Array of reveresely sorted object keys
 */
function getReversedSortedKeys(object) {
    let keys = [];
    for (let key in object) {
        keys.push(key);
    }
    keys.sort();
    return keys.reverse();
}

function loadBibTeXContentDivFromData(publicationsGroupedByYearAndType, divClass) {
    let others = undefined;

    let reversedKeys = getReversedSortedKeys(publicationsGroupedByYearAndType);
    for (let index = 0; index < reversedKeys.length; index++) {
        let contentString = "";
        let year = reversedKeys[index];
        
        // year heading.
        contentString += `<div style="font-size: 20px; font-weight: bold;">
                            ${year}
                            </div>`;
        let publicationsForYear = publicationsGroupedByYearAndType[year];
        for (let categoryIndex = 0; categoryIndex < CATEGORY_ORDERING.length; categoryIndex++) {
            let category = CATEGORY_ORDERING[categoryIndex];
            if (publicationsForYear[category] != undefined) {
                let categoryHeading = CATEGORY_HEADINGS[category];
                // category heading
                contentString += `<div style="font-size: 15px; margin-left: 1em; margin-top: 10px; font-weight: bold;">
                                        ${categoryHeading}
                                    </div>`;

                contentString += `<ul>`;
                let publicationsForCategory = publicationsForYear[category];
                for (let publicationIndex = 0; publicationIndex < publicationsForCategory.length; publicationIndex++) {
                    contentString += `<li>`;
                    
                    publication = publicationsForCategory[publicationIndex];
                    
                    let bibTeXParseJSElement = publication[BIBTEX_PARSE_JS];
                    let bibTeXParseEntryTags = bibTeXParseJSElement.entrytags;
                    let citationJSElement = publication[CITATION_JS];
                    
                    // authors are handled below.
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

                    // editors are handled below.
                    let citationJSEditors = citationJSElement[EDITOR];
                    let bibTeXParseJSEditors = bibTeXParseEntryTags[EDITOR];
                    if (citationJSEditors != undefined) {
                        for (let editorIndex = 0; editorIndex < citationJSEditors.length; editorIndex++) {
                            let editor = citationJSEditors[editorIndex];
                            if (editorIndex == citationJSEditors.length - 1 && citationJSEditors.length > 1) {
                                contentString = contentString.substring(0, contentString.length - 2);
                                contentString += ` and `;
                            }
                            if (editor.literal == undefined) {
                                if (editor.given != undefined && editor.family != undefined) {
                                    if (editor[NON_DROPPING_PARTICLE] != undefined) {
                                        contentString += `${editor.given} ${editor[NON_DROPPING_PARTICLE]} 
                                                            ${editor.family}, `;
                                    } else {
                                        contentString += `${editor.given} ${editor.family}, `;
                                    }
                                    
                                } else if (editor.given != undefined) {
                                    contentString += `${editor.given}, `;
                                } else if (editor.family != undefined) {
                                    if (editor[NON_DROPPING_PARTICLE] != undefined) {
                                        contentString += `${editor[NON_DROPPING_PARTICLE]} ${editor.family}, `;
                                    } else {
                                        contentString += `${editor.family}, `;
                                    }
                                }
                            } else {
                                contentString += `${editor.literal}, `;
                            }
                        }
                    } else if (bibTeXParseJSEditors != undefined) {
                        contentString += `${bibTeXParseJSEditors}, `;
                    }

                    // title is handled below.
                    if (citationJSElement[TITLE] != undefined) {
                        contentString += `${citationJSElement[TITLE]}, `;
                    } else if (bibTeXParseEntryTags[TITLE] != undefined) {
                        contentString += `${bibTeXParseEntryTags[TITLE]}, `;
                    }

                    // conference/journal name is handled below.
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

                    // year is handled here.
                    if (bibTeXParseEntryTags[YEAR] != undefined) {
                        contentString += `${bibTeXParseEntryTags[YEAR]}, `;
                    }

                    // terminating the content with a full stop.
                    contentString = contentString.substring(0, contentString.length - 2);
                    contentString += `.`;

                    // show/hide citation button
                    let citationKey = bibTeXParseJSElement.citationkey ;
                                        + Math.random().toString(36).substring(2,15);
                    contentString += `<button id="button-${citationKey}"
                                            class="button-${citationKey}"
                                            style="background-color: #880000; margin-left: 1vw;
                                                            padding-left: 15px; padding-right: 15px;
                                                            color: white; border: none; border-radius: 5px;">
                                            Show Citation
                                        </button>`;
                    contentString += `<div id="citation-${citationKey}"
                                        class="citation-${citationKey}"
                                        style="background-color: #e8e8e8; padding: 5px; margin: 5px; color: black;
                                                    border-radius: 5px; font-size: 11px; display: none;
                                                    font-family: 'Courier New', Courier, monospace;">
                                            ${getCitationContent(bibTeXParseJSElement)}
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
                    contentString += `</li>`;
                }
                contentString += `</ul>`
            }
        }
        // appending the citation to the content.
        if (year == NO_YEAR) {
            // handle the case of other publications after all the years.
            others = contentString;
        } else {
            // append content.
            $("." + divClass).append(contentString);
        }
    }
    if (others != undefined) {
        // now append others at the end.
        $("." + divClass).append(others);
    }
}

function readAndLoadBibtexDBFor(familyNames, givenNames, filename, divClass) {
    fetch(filename).then((response) => {
        response.text().then((allText) => {
            try {
                // parse the file text
                let parsedBibTeX = bibTeXParse.toJSON(allText);
                
                // convert all keys to lowercase to enable ease of access
                let lowerCaseKeysParsedBibTeX = convertKeysToLowerCase(parsedBibTeX);
                
                // get combined data which includes bibtex-parse-js and citation-js data.
                let combinedParsedData = getCombinedParsedData(lowerCaseKeysParsedBibTeX);

                // filter the publication based on author's family names and given names.
                let publications = getPublications(familyNames, givenNames, combinedParsedData);
                
                // group the data by year and type.
                let publicationsGroupedByYearAndType = groupPublicationsByYearAndType(publications, false);
                
                // load the parsed and grouped content into a div on the page.
                loadBibTeXContentDivFromData(publicationsGroupedByYearAndType, divClass);
            } catch (error) {
                console.log(error);
                $(divClass).append("BibTeX file parsing or internal error.");
            }
        });
    });
}

function readAndLoadAllBibtexDB(filename, divClass) {
    fetch(filename).then((response) => {
        response.text().then((allText) => {
            try {
                // parse the file text.
                let parsedBibTeX = bibTeXParse.toJSON(allText);
                
                // convert all keys to lowercase to enable ease of access.
                let lowerCaseKeysParsedBibTeX = convertKeysToLowerCase(parsedBibTeX);
                
                // get combined data which includes bibtex-parse-js and citation-js data.
                let combinedParsedData = getCombinedParsedData(lowerCaseKeysParsedBibTeX);

                // group the data by year and type.
                let bibTeXDataGroupedByYearAndType = groupPublicationsByYearAndType(combinedParsedData, true);

                // load the parsed and grouped content into a div on the page.
                loadBibTeXContentDivFromData(bibTeXDataGroupedByYearAndType, divClass);
            } catch (error) {
                console.log(error);
                $(divClass).append("BibTeX file parsing or internal error.");
            }
        });
    });
}

window.getPublicationsFor = readAndLoadBibtexDBFor;
window.getAllPublications = readAndLoadAllBibtexDB;