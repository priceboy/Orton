function getCheckInTime(time) {

    if (!time) return null;

    let [h, m] = time.split(":").map(Number);

    h -= 4;

    if (h < 0) h += 24;

    return `${h.toString().padStart(2, '0')}:${m}`;
}

function parseTicket(text) {

    // =========================
    // NAME
    // =========================

    const nameMatch =
    text.match(/»\s*([A-Z\s\/]+?)Check-In/i);

    let name =
    nameMatch?.[1]?.trim() || null;

    if (name) {
        name = name.replace(/[^A-Z\s\/]/g, "");
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
        .trim();

        finalDestination =
        cityToAirport[city] || null;
    }

    // =========================
    // SPLIT SEGMENTS
    // =========================

    const segments =
    text.split("DEPARTURE:")
    .slice(1);

    const legs = [];

    // =========================
    // EXTRACT ALL LEGS
    // =========================

    segments.forEach(seg => {

        const airportMatches =
        [...seg.matchAll(/\n([A-Z]{3})\n/g)];

        if (airportMatches.length < 2)
            return;

        const from =
        airportMatches[0][1];

        const to =
        airportMatches[1][1];

        const depDate =
        seg.match(
            /\b\d{1,2}\s+[A-Z]{3}\s+\d{4}\b/i
        )?.[0] || null;

        const depTime =
        seg.match(
            /Departing At:\s*\n?(\d{2}:\d{2})/i
        )?.[1] || null;

        const flightNo =
        seg.match(
            /\b([A-Z]{2}\s?\d{3,4})\b/
        )?.[1] || null;

        legs.push({
            from,
            to,
            depDate,
            depTime,
            flightNo
        });
    });

    // =========================
    // OUTBOUND FLIGHT
    // =========================

    const firstLeg = legs[0] || {};

    let departureAirport =
    firstLeg.from || null;

    let arrivalAirport =
    firstLeg.to || null;

    // =========================
    // FIND FINAL DESTINATION
    // =========================

    if (finalDestination) {

        arrivalAirport =
        finalDestination;
    }

    // =========================
    // DETECT RETURN LEG
    // =========================

    let returnLeg = null;

    for (let leg of legs) {

        // RETURN starts where
        // outbound destination becomes departure

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
        /\n([A-Z ]+LIMITED)/
    )?.[1]?.trim() || null;

    // =========================
    // BAGGAGE
    // =========================

    const cabin =
    text.match(
        /Cabin Baggage:\s*Adult,\s*([^\n]+)/
    )?.[1] || null;

    const checked =
    text.match(
        /Checked Baggage:\s*Adult,\s*([^\n]+)/
    )?.[1] || null;

    // =========================
    // FINAL OUTPUT
    // =========================

    return {

        customer_name: name,

        departure_airport:
        departureAirport,

        arrival_airport:
        arrivalAirport,

        departure_date:
        firstLeg.depDate,

        departure_time:
        firstLeg.depTime,

        checkin_time:
        getCheckInTime(firstLeg.depTime),

        airline_name:
        airline,

        flight_number:
        firstLeg.flightNo,

        cabin_luggage:
        cabin,

        checked_luggage:
        checked,

        trip_type:
        isRoundTrip
        ? "ROUND_TRIP"
        : "ONE_WAY",

        // =========================
        // RETURN DATA
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
