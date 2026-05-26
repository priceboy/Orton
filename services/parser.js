function getCheckInTime(time) {

    if (!time) return null;

    let [h, m] = time.split(":").map(Number);

    h -= 4;

    if (h < 0) h += 24;

    return `${h.toString().padStart(2, '0')}:${m
        .toString()
        .padStart(2, '0')}`;
}

function cleanValue(value) {

    if (!value) return null;

    return value
        .replace(/\s+/g, " ")
        .replace(/[|]/g, "")
        .trim();
}

function parseTicket(text) {

    // =====================================
    // CLEAN TEXT
    // =====================================

    text = text
        .replace(/\r/g, "\n")
        .replace(/\t/g, " ")
        .replace(/[ ]{2,}/g, " ");

    // =====================================
    // CUSTOMER NAME
    // =====================================

    let customerName = null;

    const namePatterns = [

        /(?:MR|MRS|MS)\s+([A-Z\/\s]{5,})/i,

        /PASSENGER\s*:?[\s\n]+([A-Z\/\s]{5,})/i,

        /NAME\s*:?[\s\n]+([A-Z\/\s]{5,})/i,

        /»\s*([A-Z\/\s]+?)Check-In/i
    ];

    for (const pattern of namePatterns) {

        const match = text.match(pattern);

        if (match?.[1]) {

            customerName = cleanValue(match[1]);

            customerName = customerName
                .replace(/[^A-Z\/\s]/gi, "")
                .trim();

            break;
        }
    }

    // =====================================
    // HEADER DESTINATION
    // =====================================

    let outboundDestination = null;

    const cityToAirport = {

        DOUALA: "DLA",
        KIGALI: "KGL",
        PARIS: "CDG",
        BANGUI: "BGF",
        BRUSSELS: "BRU",
        ISTANBUL: "IST",
        NAIROBI: "NBO"
    };

    const headerMatch =
    text.match(/TRIP TO\s+([A-Z\s]+)/i);

    if (headerMatch?.[1]) {

        const city =
        headerMatch[1]
            .trim()
            .split(" ")[0]
            .toUpperCase();

        outboundDestination =
        cityToAirport[city] || null;
    }

    // =====================================
    // EXTRACT ALL DATES
    // =====================================

    const allDates =

    [...text.matchAll(

        /\b\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}\b/gi
    )]

    .map(m => cleanValue(m[0]));

    // REMOVE DUPLICATES

    const uniqueDates =
    [...new Set(allDates)];

    // =====================================
    // EXTRACT ALL TIMES
    // =====================================

    const allTimes =

    [...text.matchAll(

        /\b\d{2}:\d{2}\b/g
    )]

    .map(m => m[0]);

    // =====================================
    // EXTRACT FLIGHT NUMBERS
    // =====================================

    const allFlightNumbers =

    [...text.matchAll(

        /\b([A-Z]{2}\s?\d{3,4})\b/g
    )]

    .map(m => cleanValue(m[1]));

    // REMOVE DUPLICATES

    const uniqueFlightNumbers =
    [...new Set(allFlightNumbers)];

    // =====================================
    // EXTRACT AIRPORTS
    // =====================================

    const airportMatches =

    [...text.matchAll(/\b[A-Z]{3}\b/g)]

    .map(m => m[0])

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

    // =====================================
    // BUILD FLIGHT LEGS
    // =====================================

    const legs = [];

    for (let i = 0; i < airportMatches.length - 1; i++) {

        const from = airportMatches[i];
        const to = airportMatches[i + 1];

        // SKIP SAME AIRPORT
        if (from === to)
            continue;

        // VALID ROUTE
        if (
            from.length === 3 &&
            to.length === 3
        ) {

            // AVOID DUPLICATE LEGS
            const alreadyExists =
            legs.find(l =>
                l.from === from &&
                l.to === to
            );

            if (!alreadyExists) {

                legs.push({

                    from,
                    to,

                    departure_date:
                    uniqueDates[legs.length] || null,

                    departure_time:
                    allTimes[legs.length] || null,

                    flight_number:
                    uniqueFlightNumbers[legs.length] || null
                });
            }
        }
    }

    // =====================================
    // DEBUG LEGS
    // =====================================

    console.log("========== LEGS ==========");
    console.log(legs);

    // =====================================
    // OUTBOUND LEG
    // =====================================

    const outboundLeg =
    legs[0] || {};

    const departureAirport =
    outboundLeg.from || null;

    let arrivalAirport =
    outboundLeg.to || null;

    // HEADER OVERRIDE

    if (outboundDestination) {

        arrivalAirport =
        outboundDestination;
    }

    // =====================================
    // DETECT ROUND TRIP
    // =====================================

    let isRoundTrip = false;

    let returnLeg = null;

    for (const leg of legs.slice(1)) {

        // IF SEGMENTS CONTINUE AFTER DESTINATION

        if (leg.from === arrivalAirport) {

            isRoundTrip = true;

            // REVERSED ROUTE

            if (
                leg.to === departureAirport
            ) {

                returnLeg = leg;
                break;
            }
        }
    }

    // =====================================
    // FALLBACK RETURN LEG
    // =====================================

    if (!returnLeg && isRoundTrip) {

        returnLeg = {

            from: arrivalAirport,
            to: departureAirport,

            departure_date:
            uniqueDates[1] || null,

            departure_time:
            allTimes[1] || null,

            flight_number:
            uniqueFlightNumbers[1] || null
        };
    }

    // =====================================
    // AIRLINE
    // =====================================

    const airline =

    text.match(
        /\b(RWANDAIR|AIR FRANCE|KENYA AIRWAYS|ETHIOPIAN AIRLINES)\b/i
    )?.[1]

    ||

    text.match(
        /\n([A-Z ]+LIMITED)/i
    )?.[1]

    ||

    null;

    // =====================================
    // CABIN LUGGAGE
    // =====================================

    let cabinLuggage = null;

    const cabinPatterns = [

        /Cabin\s*Baggage[\s\S]{0,80}?(\d+\s?(?:KG|PC))/i,

        /CABIN[\s\S]{0,80}?(\d+\s?(?:KG|PC))/i,

        /Hand\s*Baggage[\s\S]{0,80}?(\d+\s?(?:KG|PC))/i
    ];

    for (const pattern of cabinPatterns) {

        const match = text.match(pattern);

        if (match?.[1]) {

            cabinLuggage =
            cleanValue(match[1]);

            break;
        }
    }

    // =====================================
    // CHECKED LUGGAGE
    // =====================================

    let checkedLuggage = null;

    const checkedPatterns = [

        /Checked\s*Baggage[\s\S]{0,80}?(\d+\s?(?:KG|PC))/i,

        /CHECKED[\s\S]{0,80}?(\d+\s?(?:KG|PC))/i,

        /Baggage\s*Allowance[\s\S]{0,80}?(\d+\s?(?:KG|PC))/i
    ];

    for (const pattern of checkedPatterns) {

        const match = text.match(pattern);

        if (match?.[1]) {

            checkedLuggage =
            cleanValue(match[1]);

            break;
        }
    }

    // =====================================
    // FINAL DEBUG
    // =====================================

    console.log("========== FINAL ==========");

    console.log({

        customerName,

        departureAirport,
        arrivalAirport,

        outboundDate:
        outboundLeg.departure_date,

        returnDate:
        returnLeg?.departure_date,

        cabinLuggage,
        checkedLuggage,

        tripType:
        isRoundTrip
        ? "ROUND_TRIP"
        : "ONE_WAY"
    });

    // =====================================
    // FINAL OUTPUT
    // =====================================

    return {

        customer_name:
        customerName,

        // =====================================
        // OUTBOUND
        // =====================================

        departure_airport:
        departureAirport,

        arrival_airport:
        arrivalAirport,

        departure_date:
        outboundLeg.departure_date || null,

        departure_time:
        outboundLeg.departure_time || null,

        checkin_time:
        getCheckInTime(
            outboundLeg.departure_time
        ),

        airline_name:
        cleanValue(airline),

        flight_number:
        outboundLeg.flight_number || null,

        // =====================================
        // BAGGAGE
        // =====================================

        cabin_luggage:
        cabinLuggage,

        checked_luggage:
        checkedLuggage,

        // =====================================
        // TRIP TYPE
        // =====================================

        trip_type:
        isRoundTrip
        ? "ROUND_TRIP"
        : "ONE_WAY",

        // =====================================
        // RETURN TRIP
        // =====================================

        return_departure_airport:
        returnLeg?.from || null,

        return_arrival_airport:
        returnLeg?.to || null,

        return_departure_date:
        returnLeg?.departure_date || null,

        return_departure_time:
        returnLeg?.departure_time || null,

        return_checkin_time:
        getCheckInTime(
            returnLeg?.departure_time
        ),

        return_flight_number:
        returnLeg?.flight_number || null
    };
}

module.exports = parseTicket;
