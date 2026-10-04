## Invite a collaborator

`POST /api/trips/:id/collaborators`

Invites someone to collaborate on a trip. If they already have an account, they're added as a collaborator immediately. If not, a pending invite is created and they're emailed a signup link; they're automatically added once they register with that email.

### Auth

Required. Caller must be the trip's **owner** (not just a collaborator).

### Path parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `id` | string | Trip ID |

### Request body

```json
{
    "email": "friend@example.com"
}
```

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `email` | string | yes | Must be a valid email address|

### Success response
`200 OK` - returns the updated trip, including the new collaborator (if they had an account) or a new entry in `pendingCollaborators` (if they didn't have an account).

```json
{
    "_id": "...",
    "collaborators": [{ "_id": "...", "name": "...", "email": "..." }],
    "pendingCollaborators": [{ "email": "...", "invitedAt": "..." }],
    ...
}
```

### Error responses

| Status | Condition | Body |
| ------ | --------- | ---- |
| 400 | Request body fails validation (bad email format) | `{ "error": "Validation failed", "details": {...} }` |
| 400 | Invitee is already the trip owner | `{ "error": "The user is already the trip owner" }` |
| 400 | Invitee is already a collaborator | `{ "error": "The user is already a collaborator" }` |
| 404 | Trip doesn't exist, or caller isn't the owner | `{ "error": "Trip not found" }` |
| 429 | Rate limit exceeded (20 invites / 15 min per user) | `{ "error": "Too many requests, please try again later." }` |

### Example

Request:

```json
POST /api/trips/64f1.../collaborators
Authorization: Bearer <token>
Content-Type: application/json

{ "email": "newfriend@example.com" }
```

Response: `200 OK`
```json
{
    "_id": "64f1...",
    "title": "Tokyo Summer 2026",
    "collaborators": [],
    "pendingCollaborators": [
        { "email": "newfriend@example.com", "invitedAt": "2026-10-03T12:00:00.000Z" }
    ]
}
```

## Export trip to calendar

`GET /api/trips/:id/calendar/export`

Export trip itinerary items in ICS format as a downloadable .ics file, importable into any calendar app.

### Auth

Required. Caller must be an **owner** or **collaborator**.

### Path parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| `id` | string | Trip ID |

### Success response
`200 OK` - returns the .ics file containing the exported trip's items in calendar format.

Event times are written as local/floating time, with no timezone conversion applied.

A trip with no items still returns 200 with a valid, empty calendar, not yielding an error.

```
Content-Type: text/calendar
Content-Disposition: attachment; filename="trip-name.ics"
```

filename is derived from the sanitized trip title, not a fixed string.

### Error responses

| Status | Condition | Body |
| ------ | --------- | ---- |
| 400 | Invalid trip id | `{ "error": "Invalid trip id" }` |
| 404 | Trip doesn't exist, or caller isn't the owner or a collaborator | `{ "error": "Trip not found" }` |

### Example

Request
```
GET /api/trips/71w3.../calendar/export
Authorization: Bearer <token>
```

Response: 200 OK
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Voyage//Trip Export//EN
BEGIN:VEVENT
UID:abc123@voyage.app
DTSTAMP:20261003T120000Z
DTSTART:20261201T090000
DTEND:20261201T100000
SUMMARY:Breakfast at Tsukiji Market
END:VEVENT
END:VCALENDAR
```