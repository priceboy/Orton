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
    // ✅ NAME EXTRACTION
    // =========================

    const nameMatch =
    text.match(/»\s*([A-Z\s\/]+?)Check-In/i);

    let name =
    nameMatch?.[1]?.trim() || null;

    if (name) {

        name =
        name.replace(/[^A-Z\s\/]/g, "");
    }

    // =========================
    // ✅ HEADER DESTINATION
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

    let headerArrival = null;

    if (headerDestination) {

        const city =
        headerDestination
        .split(",")[0]
        .trim();

        headerArrival =
        cityToAirport[city] || null;
    }

    // =========================
    // ✅ EXTRACT FLIGHT SEGMENTS
    // =========================

    const segments =
    text.split("DEPARTURE:")
    .slice(1);

    const legs = [];

    for (let seg of segments) {

        // =========================
        // ✅ AIRPORTS
        // =========================

        const airportMatches =
        [...seg.matchAll(/\b([A-Z]{3})\b/g)];

        if (airportMatches.length < 2)
            continue;

        const from =
        airportMatches[0][1];

        const to =
        airportMatches[1][1];

        // =========================
        // ✅ DATE EXTRACTION
        // =========================

        let segmentDate = null;

        const lines =
        seg.split("\n")
        .map(line => line.trim())
        .filter(Boolean);

        for (let line of lines) {

            const foundDate =

            line.match(
                /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/i
            )?.[0]

            ||

            line.match(
                /\b\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/i
            )?.[0]

            ||

            null;

            if (foundDate) {

                segmentDate = foundDate;
                break;
            }
        }

        // =========================
        // ✅ DEPARTURE TIME
        // =========================

        const segmentTime =

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
        // ✅ FLIGHT NUMBER
        // =========================

        const segmentFlight =
        seg.match(
            /\b([A-Z]{2}\s?\d{3,4})\b/
        )?.[1]

        ||

        null;

        // =========================
        // ✅ CABIN BAGGAGE
        // =========================

        const cabin =
        seg.match(
            /Cabin Baggage:\s*Adult,\s*([^\n]+)/i
        )?.[1]

        ||

        seg.match(
            /Cabin Baggage\s*([^\n]+)/i
        )?.[1]

        ||

        null;

        // =========================
        // ✅ CHECKED BAGGAGE
        // =========================

        const checked =
        seg.match(
            /Checked Baggage:\s*Adult,\s*([^\n]+)/i
        )?.[1]

        ||

        seg.match(
            /Checked Baggage\s*([^\n]+)/i
        )?.[1]

        ||

        null;

        // =========================
        // ✅ SAVE LEG
        // =========================

        legs.push({

            from,

            to,

            departure_date: segmentDate,

            departure_time: segmentTime,

            flight_number: segmentFlight,

            cabin_luggage: cabin,

            checked_luggage: checked
        });
    }

    // =========================
    // ✅ DEBUG
    // =========================

    console.log("LEGS:", legs);

    // =========================
    // ✅ OUTBOUND LEG
    // =========================

    const outboundLeg =
    legs[0] || {};

    let departureAirport =
    outboundLeg.from || null;

    let arrivalAirport =
    outboundLeg.to || null;

    // =========================
    // ✅ OVERRIDE HEADER DESTINATION
    // =========================

    if (headerArrival) {

        arrivalAirport =
        headerArrival;
    }

    // =========================
    // ✅ FIND RETURN LEG
    // =========================

    let returnLeg = null;

    if (
        departureAirport &&
        arrivalAirport
    ) {

        returnLeg =
        legs.find((leg, index) =>

            index !== 0 &&

            leg.from === arrivalAirport &&

            leg.to === departureAirport
        );
    }

    // =========================
    // ✅ ROUND TRIP CHECK
    // =========================

    const isRoundTrip =
    !!returnLeg;

    // =========================
    // ✅ AIRLINE
    // =========================

    const airline =
    text.match(
        /\n([A-Z ]+LIMITED)/i
    )?.[1]?.trim()

    ||

    text.match(
        /\n([A-Z ]+AIRLINES?)/i
    )?.[1]?.trim()

    ||

    null;

    // =========================
    // ✅ FINAL DEBUG
    // =========================

    console.log("OUTBOUND:", outboundLeg);

    console.log("RETURN:", returnLeg);

    // =========================
    // ✅ FINAL OUTPUT
    // =========================

    return {

        customer_name: name,

        // =========================
        // ✅ OUTBOUND
        // =========================

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

        cabin_luggage:
        outboundLeg.cabin_luggage || null,

        checked_luggage:
        outboundLeg.checked_luggage || null,

        // =========================
        // ✅ AIRLINE
        // =========================

        airline_name:
        airline,

        // =========================
        // ✅ TRIP TYPE
        // =========================

        trip_type:
        isRoundTrip
        ? "ROUND_TRIP"
        : "ONE_WAY",

        // =========================
        // ✅ RETURN FLIGHT
        // =========================

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
        returnLeg?.flight_number || null,

        return_cabin_luggage:
        returnLeg?.cabin_luggage || null,

        return_checked_luggage:
        returnLeg?.checked_luggage || null
    };
}

module.exports = parseTicket;
