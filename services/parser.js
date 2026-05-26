function getCheckInTime(time) {

    if (!time) return null;

    let [h, m] = time.split(":").map(Number);

    h -= 4;

    if (h < 0) h += 24;

    return `${h.toString().padStart(2, "0")}:${m
        .toString()
        .padStart(2, "0")}`;
}

function parseTicket(text) {

    // =========================================
    // CLEAN RAW PDF TEXT
    // =========================================

    text = text
        .replace(/\r/g, "")
        .replace(/\t/g, " ")
        .replace(/[ ]{2,}/g, " ")
        .replace(/\n{2,}/g, "\n");

    // =========================================
    // DEBUG RAW TEXT
    // =========================================

    console.log("========== RAW PDF ==========");
    console.log(text);

    // =========================================
    // PASSENGER NAME
    // =========================================

    let customerName =

        text.match(
            /(?:Mr|Mrs|Ms|MSTR)?\s*([A-Z\/ ]{6,})\s+Check-In/i
        )?.[1]

        ||

        text.match(
            /PASSENGER(?:\(S\))?\s*[:\-]?\s*([A-Z\/ ]{6,})/i
        )?.[1]

        ||

        null;

    if (customerName) {

        customerName = customerName
            .replace(/[^A-Z\/ ]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    // =========================================
    // AIRLINE
    // =========================================

    const airlineName =

        text.match(
            /\b(RWANDAIR|ETHIOPIAN AIRLINES|KENYA AIRWAYS|AIR FRANCE|BRUSSELS AIRLINES|TURKISH AIRLINES)\b/i
        )?.[1]

        ||

        text.match(
            /\n([A-Z ]+LIMITED)/i
        )?.[1]

        ||

        null;

    // =========================================
    // ALL DATES
    // =========================================

    const allDates =

        [...text.matchAll(

            /\b\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}\b/gi

        )]

        .map(m => m[0].toUpperCase());

    // REMOVE DUPLICATES

    const uniqueDates = [...new Set(allDates)];

    console.log("DATES:", uniqueDates);

    // =========================================
    // FLIGHT SEGMENTS
    // =========================================

    const flightRegex =

        /\b([A-Z]{2}\s?\d{3,4})\b[\s\S]{0,250}?\b([A-Z]{3})\b[\s\S]{0,120}?\b([A-Z]{3})\b[\s\S]{0,120}?(\d{2}:\d{2})/gi;

    const blockedCodes = [

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
    ];

    const legs = [];

    let match;

    while ((match = flightRegex.exec(text)) !== null) {

        const flightNumber =
            match[1]?.replace(/\s+/g, "");

        const from =
            match[2]?.toUpperCase();

        const to =
            match[3]?.toUpperCase();

        const departureTime =
            match[4];

        // FILTER GARBAGE

        if (
            blockedCodes.includes(from) ||
            blockedCodes.includes(to)
        ) {
            continue;
        }

        legs.push({

            from,

            to,

            departure_time:
                departureTime,

            flight_number:
                flightNumber
        });
    }

    // =========================================
    // REMOVE DUPLICATE LEGS
    // =========================================

    const cleanLegs = [];

    const seen = new Set();

    for (const leg of legs) {

        const key = `${leg.from}-${leg.to}-${leg.flight_number}`;

        if (!seen.has(key)) {

            seen.add(key);

            cleanLegs.push(leg);
        }
    }

    // =========================================
    // ASSIGN DATES
    // =========================================

    cleanLegs.forEach((leg, index) => {

        leg.departure_date =
            uniqueDates[index] || null;
    });

    console.log("LEGS:", cleanLegs);

    // =========================================
    // NO LEGS FOUND
    // =========================================

    if (cleanLegs.length === 0) {

        return {

            customer_name: customerName,

            airline_name: airlineName,

            trip_type: "UNKNOWN"
        };
    }

    // =========================================
    // OUTBOUND
    // =========================================

    const outboundLeg =
        cleanLegs[0];

    const departureAirport =
        outboundLeg.from;

    // FINAL DESTINATION =
    // LAST DESTINATION BEFORE RETURN

    let arrivalAirport =
        outboundLeg.to;

    if (cleanLegs.length >= 2) {

        arrivalAirport =
            cleanLegs[1].to;
    }

    // =========================================
    // RETURN DETECTION
    // =========================================

    let returnLeg = null;

    for (let i = 1; i < cleanLegs.length; i++) {

        const leg = cleanLegs[i];

        // RETURN ENDS BACK HOME

        if (leg.to === departureAirport) {

            returnLeg = leg;
            break;
        }
    }

    // =========================================
    // TRIP TYPE
    // =========================================

    const tripType =
        returnLeg
        ? "ROUND_TRIP"
        : "ONE_WAY";

    // =========================================
    // CABIN LUGGAGE
    // =========================================

    let cabinLuggage =

        text.match(

            /Cabin\s*Baggage[\s\S]{0,50}?(\d+\s?(?:KG|KGS|PC))/i

        )?.[1]

        ||

        text.match(

            /Cabin[\s\S]{0,20}?(\d+\s?KG)/i

        )?.[1]

        ||

        null;

    // =========================================
    // CHECKED LUGGAGE
    // =========================================

    let checkedLuggage =

        text.match(

            /Checked\s*Baggage[\s\S]{0,60}?(\d+\s?(?:KG|KGS|PC))/i

        )?.[1]

        ||

        text.match(

            /Baggage[\s\S]{0,20}?(\d+\s?PC)/i

        )?.[1]

        ||

        null;

    // =========================================
    // CLEAN BAGGAGE
    // =========================================

    if (cabinLuggage) {

        cabinLuggage =
            cabinLuggage
            .replace(/\s+/g, " ")
            .trim();
    }

    if (checkedLuggage) {

        checkedLuggage =
            checkedLuggage
            .replace(/\s+/g, " ")
            .trim();
    }

    // =========================================
    // RETURN DATE
    // =========================================

    let returnDate = null;

    if (returnLeg) {

        returnDate =
            returnLeg.departure_date;
    }

    // =========================================
    // DEBUG
    // =========================================

    console.log("================================");
    console.log("CUSTOMER:", customerName);
    console.log("AIRLINE:", airlineName);
    console.log("OUTBOUND:", outboundLeg);
    console.log("RETURN:", returnLeg);
    console.log("CABIN:", cabinLuggage);
    console.log("CHECKED:", checkedLuggage);
    console.log("================================");

    // =========================================
    // FINAL OBJECT
    // =========================================

    return {

        // =====================================
        // CUSTOMER
        // =====================================

        customer_name:
            customerName,

        airline_name:
            airlineName,

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
            tripType,

        // =====================================
        // RETURN
        // =====================================

        return_departure_airport:
            returnLeg?.from || null,

        return_arrival_airport:
            returnLeg?.to || null,

        return_departure_date:
            returnDate || null,

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
