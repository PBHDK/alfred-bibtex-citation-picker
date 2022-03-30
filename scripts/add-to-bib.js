#!/usr/bin/env osascript -l JavaScript

function run (argv) {
	ObjC.import("stdlib");
	ObjC.import("Foundation");
	const app = Application.currentApplication();
	app.includeStandardAdditions = true;

	const input = argv.join("");
	const libraryPath = $.getenv("bibtex_library_path").replace(/^~/, app.pathTo("home folder"));
	const doiRegex = /^.*\/?(10\.\S+)\/?$/;

	// ------------------

	function appendToFile(text, absPath) {
		// ⚠️ use single quotes to prevent running of input "$(rm -rf /)"
		app.doShellScript (`echo '${text}' >> '${absPath}'`);
	}

	function readFile (path, encoding) {
		if (!encoding) encoding = $.NSUTF8StringEncoding;
		const fm = $.NSFileManager.defaultManager;
		const data = fm.contentsAtPath(path);
		const str = $.NSString.alloc.initWithDataEncoding(data, encoding);
		return ObjC.unwrap(str);
	}

	function generateCitekey (bibtexPropertyArr) {
		function parseBibtexProperty (arr, property) {
			arr = arr
				.map(line => line.trim())
				.filter(p => p.startsWith(property + " "));
			if (!arr.length) return "";
			const value = arr[0]
				.split("=")[1]
				.replace(/{|}|,$/g, "")
				.trim();
			return value;
		}
		const year = parseBibtexProperty(bibtexPropertyArr, "year");
		const authors = parseBibtexProperty(bibtexPropertyArr, "author");

		const lastNameArr = authors
			.split(" and ") // "and" used as delimiter in bibtex for names
			.map(name => name.split(" ").pop() ); // doi.org returns format: "first name - last name"

		let authorStr = "";
		if (lastNameArr.length < 3) authorStr = lastNameArr.join("");
		else authorStr = lastNameArr[0] + "EtAl";

		const citekey = authorStr + year;

		// check if citekey already exists
		const citekeyArray = readFile(libraryPath)
			.split("\n")
			.filter(line => line.startsWith("@"))
			.map(line => line.split("{")[1].replaceAll(",", "") );

		const alphabet = "abcdefghijklmnopqrstuvwxyz";
		let i = -1;
		let nextCitekey = citekey;
		while (citekeyArray.includes(nextCitekey)) {
			let nextLetter = alphabet[i];
			if (i === -1) nextLetter = ""; // first loop
			nextCitekey = citekey + nextLetter;
			i++;
			if (i > alphabet.length - 1) break; // in case the citekey is already used 27 times (lol)
		}
		return nextCitekey;
	}

	// --------------------

	// transform input into doiURL, sicne that's what doi.org requires
	const doiURL = input.replace(doiRegex, "https://doi.org/$1");

	// get bibtex entry & filter it & generate new citekey
	const newEntryProperties = app.doShellScript (`curl -sLH "Accept: application/x-bibtex" "${doiURL}"`) // https://citation.crosscite.org/docs.html
		.split("\r") // can safely be used as delimiter since this is what doi.org returns, but must be /r instead of /n because JXA
		.filter (p => !p.startsWith("issn") && !p.startsWith("month") ); // remove unwanted properties
	const newCitekey = generateCitekey(newEntryProperties);
	newEntryProperties[0] = newEntryProperties[0].split("{")[0] + "{" + newCitekey + ",";

	// result
	const newEntry = newEntryProperties.join("\n") + "\n";
	appendToFile(newEntry, libraryPath);
	return newCitekey; // pass for opening
}