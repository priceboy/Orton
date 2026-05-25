function getCheckInTime(time) {

    if (!time) return null;

    let [h, m] = time.split(":").map(Number);

    h -= 4;

    if (h < 0) h += 24;

    return `${h.toString().padStart(2, '0')}:${m
        .toString()
        .padStart(2, '0')}`;
}

function parseTicket(text) {

    // =========================
    // CLEAN TEXT
    // =========================

    text = text
        .replace(/\r/g, "")
        .replace(/\t/g, " ");

    // =========================
    // NAME
    // =========================

    const nameMatch =
    text.match(/»\s*([A-Z\s\/]+?)Check-In/i);

    let name =
    nameMatch?.[1]?.trim() || null;

    if (name) {

        name =
        name.replace(/[^A-Z\s\/]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    // =========================
    // HEADER DESTINATION
    // =========================

    const headerMatch =
    text.match(/TRIP TO\s+([A-Z\s]+)/i);

    let headerDestination =
    headerMatch?.[1]?.trim();

    const cityToAirport = {

        "DOUALA": "DLA",

        "KIGALI": "KGL",

        "PARIS": "CDG",

        "BANGUI": "BGF"
    };

    let finalDestination = null;

    if (headerDestination) {

        const city =
        headerDestination
        .split(",")[0]
        .trim()
        .toUpperCase();

        finalDestination =
        cityToAirport[city] || null;
    }

    // =========================
    // SPLIT SEGMENTS
    // =========================

    const rawParts =
    text.split("DEPARTURE:");

    const segments =
    rawParts.slice(1);

    const legs = [];

    // =========================
    // EXTRACT LEGS
    // =========================

    segments.forEach((seg, index) => {

        // =========================
        // AIRPORTS
        // =========================

        const airportMatches =

        [...seg.matchAll(/\b([A-Z]{3})\b/g)]

        .map(m => m[1])

        .filter(code => {

            return ![

                "ADT",
                "CNN",
                "INF",
                "BAG",
                "CAB",
                "VAT",

                "JAN",
                "FEB",
                "MAR",
                "APR",
                "MAY",
                "JUN",
                "JUL",
                "AUG",
                "SEP",
                "OCT",
                "NOV",
                "DEC"

            ].includes(code);
        });

        // REMOVE DUPLICATES
        const airports =
        [...new Set(airportMatches)];

        if (airports.length < 2)
            return;

        const from =
        airports[0];

        const to =
        airports[1];

        // =========================
        // DATE EXTRACTION
        // =========================
        // DATE IS USUALLY ABOVE
        // THE DEPARTURE BLOCK
        // =========================

        const beforeSegment =
        rawParts[index];

        const foundDates =

        [...beforeSegment.matchAll(

            /\b\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}\b/gi
        )]

        .map(m => m[0]);

        let depDate =
        foundDates[foundDates.length - 1]

        ||

        seg.match(
            /\b\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}\b/i
        )?.[0]

        ||

        null;

        // =========================
        // TIME
        // =========================

        const depTime =

        seg.match(
            /Departing At:\s*\n?\s*(\d{2}:\d{2})/i
        )?.[1]

        ||

        seg.match(
            /\b(\d{2}:\d{2})\b/
        )?.[1]

        ||

        null;

        // =========================
        // FLIGHT NUMBER
        // =========================

        const flightNo =

        seg.match(
            /\b([A-Z]{2}\s?\d{3,4})\b/
        )?.[1]

        ||

        null;

        // =========================
        // SAVE LEG
        // =========================

        legs.push({

            from,

            to,

            depDate,

            depTime,

            flightNo
        });
    });

    // =========================
    // DEBUG
    // =========================

    console.log("ALL LEGS:", legs);

    // =========================
    // OUTBOUND
    // =========================

    const firstLeg =
    legs[0] || {};

    const departureAirport =
    firstLeg.from || null;

    let arrivalAirport =
    firstLeg.to || null;

    // =========================
    // FINAL DESTINATION
    // =========================

    if (finalDestination) {

        arrivalAirport =
        finalDestination;
    }

    // =========================
    // RETURN LEG
    // =========================

    let returnLeg = null;

    for (let i = 1; i < legs.length; i++) {

        const leg = legs[i];

        // RETURN STARTS WHEN
        // FINAL DESTINATION
        // BECOMES DEPARTURE

        if (

            leg.from === arrivalAirport &&

            leg.to === departureAirport
        ) {

            returnLeg = leg;
            break;
        }
    }

    // =========================
    // TRIP TYPE
    // =========================

    const isRoundTrip =
    !!returnLeg;

    // =========================
    // AIRLINE
    // =========================

    const airline =

    text.match(
        /\n([A-Z ]+LIMITED)/i
    )?.[1]?.trim()

    ||

    text.match(
        /\b(ETHIOPIAN AIRLINES|RWANDAIR|AIR FRANCE|KENYA AIRWAYS)\b/i
    )?.[1]

    ||

    null;

    // =========================
    // CABIN LUGGAGE
    // =========================

    let cabin =

    text.match(
        /Cabin\s*Baggage\s*:\s*Adult\s*,?\s*([^\n]+)/i
    )?.[1]

    ||

    text.match(
        /Cabin\s*Baggage\s*:\s*([^\n]+)/i
    )?.[1]

    ||

    text.match(
        /Cabin\s*Baggage\s*\n\s*([^\n]+)/i
    )?.[1]

    ||

    text.match(
        /CABIN\s*:?[\s\n]*([0-9]+\s*(?:KG|KGS))/i
    )?.[1]

    ||

    null;

    if (cabin) {

        cabin =
        cabin
        .replace(/Adult,/i, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    // =========================
    // CHECKED LUGGAGE
    // =========================

    let checked =

    text.match(
        /Checked\s*Baggage\s*:\s*Adult\s*,?\s*([^\n]+)/i
    )?.[1]

    ||

    text.match(
        /Checked\s*Baggage\s*:\s*([^\n]+)/i
    )?.[1]

    ||

    text.match(
        /Checked\s*Baggage\s*\n\s*([^\n]+)/i
    )?.[1]

    ||

    text.match(
        /CHECKED\s*:?[\s\n]*([^\n]+)/i
    )?.[1]

    ||

    null;

    if (checked) {

        checked =
        checked
        .replace(/Adult,/i, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    // =========================
    // DEBUG
    // =========================

    console.log("OUTBOUND:", firstLeg);

    console.log("RETURN:", returnLeg);

    console.log("CABIN:", cabin);

    console.log("CHECKED:", checked);

    // =========================
    // FINAL OUTPUT
    // =========================

    return {

        customer_name: name,

        // =========================
        // OUTBOUND
        // =========================

        departure_airport:
        departureAirport,

        arrival_airport:
        arrivalAirport,

        departure_date:
        firstLeg.depDate || null,

        departure_time:
        firstLeg.depTime || null,

        checkin_time:
        getCheckInTime(
            firstLeg.depTime
        ),

        flight_number:
        firstLeg.flightNo || null,

        // =========================
        // AIRLINE / LUGGAGE
        // =========================

        airline_name:
        airline,

        cabin_luggage:
        cabin,

        checked_luggage:
        checked,

        // =========================
        // TRIP TYPE
        // =========================

        trip_type:
        isRoundTrip
        ? "ROUND_TRIP"
        : "ONE_WAY",

        // =========================
        // RETURN FLIGHT
        // =========================

        return_departure_airport:
        returnLeg?.from || null,

        return_arrival_airport:
        returnLeg?.to || null,

        return_departure_date:
        returnLeg?.depDate || null,

        return_departure_time:
        returnLeg?.depTime || null,

        return_checkin_time:
        getCheckInTime(
            returnLeg?.depTime
        ),

        return_flight_number:
        returnLeg?.flightNo || null
    };
}

module.exports = parseTicket;
