import os
import re

import anthropic
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

OPENSTATES_API_KEY = os.getenv("OPENSTATES_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CONGRESS_API_KEY = os.getenv("CONGRESS_API_KEY")

app = FastAPI(title="How Did They Vote?")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5177"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATE_ABBREV = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
    "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
    "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
    "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC",
}


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


@app.get("/officials")
async def get_officials(address: str = Query(...)):
    headers = {"User-Agent": "HowDidTheyVote/1.0"}

    async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
        # Step 1 — Geocode with Nominatim
        try:
            geo_resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": address, "format": "json", "addressdetails": "1", "limit": "1"},
            )
            geo_resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Geocoding error: {e.response.text}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Failed to reach Nominatim: {str(e)}")

        geo_data = geo_resp.json()
        if not geo_data:
            raise HTTPException(status_code=404, detail="Address not found. Try a more specific address.")

        place = geo_data[0]
        lat = place["lat"]
        lon = place["lon"]
        addr_details = place.get("address", {})
        state_name = (
            addr_details.get("state")
            or addr_details.get("province")
            or addr_details.get("region")
            or ""
        )

        officials = []

        # Step 2 — State legislators from OpenStates /people.geo
        try:
            os_resp = await client.get(
                "https://v3.openstates.org/people.geo",
                params={"lat": lat, "lng": lon, "apikey": OPENSTATES_API_KEY},
            )
            os_resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"OpenStates geo lookup failed: {e.response.text}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Failed to reach OpenStates API: {str(e)}")

        os_data = os_resp.json()
        for person in os_data.get("results", []):
            role = person.get("current_role") or {}
            name = person.get("name", "Unknown")
            officials.append(
                {
                    "id": slugify(name),
                    "name": name,
                    "party": person.get("party", "Unknown"),
                    "title": role.get("title", "State Legislator"),
                    "level": "State",
                    "state": state_name,
                    "openstates_id": person.get("id"),
                    "bioguide_id": None,
                }
            )

        # Step 3 — Federal legislators from Congress.gov
        state_code = STATE_ABBREV.get(state_name)
        if state_code:
            try:
                congress_resp = await client.get(
                    "https://api.congress.gov/v3/member",
                    params={
                        "stateCode": state_code,
                        "currentMember": "true",
                        "api_key": CONGRESS_API_KEY,
                        "limit": "10",
                    },
                )
                congress_resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                raise HTTPException(status_code=e.response.status_code, detail=f"Congress.gov lookup failed: {e.response.text}")
            except httpx.RequestError as e:
                raise HTTPException(status_code=502, detail=f"Failed to reach Congress.gov API: {str(e)}")

            congress_data = congress_resp.json()
            for member in congress_data.get("members", []):
                name = member.get("name", "Unknown")
                terms = member.get("terms", {})
                term_items = terms.get("item", []) if isinstance(terms, dict) else []
                chamber = ""
                if term_items:
                    chamber = term_items[-1].get("chamber", "")
                title = "U.S. Senator" if "Senate" in chamber else "U.S. Representative"
                officials.append(
                    {
                        "id": slugify(name),
                        "name": name,
                        "party": member.get("partyName", "Unknown"),
                        "title": title,
                        "level": "Federal",
                        "state": state_name,
                        "openstates_id": None,
                        "bioguide_id": member.get("bioguideId"),
                    }
                )

    return officials


@app.get("/official/{official_id}/votes")
async def get_votes(
    official_id: str,
    name: str = Query(...),
    state: str = Query(...),
    level: str = Query(...),
    openstates_id: str = Query(default=""),
):
    if level == "Federal":
        return {
            "votes": [],
            "note": "Federal vote lookup requires a bioguide_id — not yet implemented.",
        }

    if level == "Local":
        return {"votes": [], "message": "Local vote data coming soon."}

    # State level — use OpenStates
    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Resolve openstates_id — skip people lookup if already provided
        if not openstates_id:
            try:
                people_resp = await client.get(
                    "https://v3.openstates.org/people",
                    params={"name": name, "jurisdiction": state.lower(), "apikey": OPENSTATES_API_KEY},
                )
                people_resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                raise HTTPException(status_code=e.response.status_code, detail=f"OpenStates people lookup failed: {e.response.text}")
            except httpx.RequestError as e:
                raise HTTPException(status_code=502, detail=f"Failed to reach OpenStates API: {str(e)}")

            people_data = people_resp.json()
            results = people_data.get("results", [])
            if not results:
                return {"votes": [], "message": f"No OpenStates record found for '{name}' in '{state}'."}

            openstates_id = results[0].get("id")

        # 2. Fetch sponsored bills
        bills_url = (
            f"https://v3.openstates.org/bills"
    f"?sponsor_id={openstates_id}&jurisdiction={state.lower()}&sort=updated_desc&apikey={OPENSTATES_API_KEY}"
)
        try:
            bills_resp = await client.get(bills_url)
            bills_resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"OpenStates bills lookup failed: {e.response.text}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Failed to reach OpenStates bills API: {str(e)}")

        bills_data = bills_resp.json()
        bills = bills_data.get("results", [])[:5]

    votes = []
    for bill in bills:
        votes.append(
            {
                "billName": bill.get("title", ""),
                "billId": bill.get("identifier", ""),
                "date": bill.get("updated_at", ""),
                "voteCast": "Sponsored",
                "summary": "",
            }
        )

    return {"votes": votes}


class SummarizeRequest(BaseModel):
    billName: str
    billId: str
    voteCast: str
    description: str


@app.post("/summarize")
async def summarize(body: SummarizeRequest):
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    user_prompt = (
        f"Bill: {body.billName} ({body.billId})\n"
        f"Vote cast: {body.voteCast}\n"
        f"Description: {body.description}\n\n"
        f"Answer these questions in exactly 2 sentences:\n"
        f"1. What does this bill do in plain English?\n"
        f"2. What does voting {body.voteCast} mean for this bill?"
    )

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=256,
            system="You summarize legislation for general audiences. Be factual and neutral. Never editorialize.",
            messages=[{"role": "user", "content": user_prompt}],
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Anthropic API error: {str(e)}")

    summary_text = message.content[0].text if message.content else ""
    return {"summary": summary_text}
