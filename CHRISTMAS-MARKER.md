# Bubble Tracks — Christmas collection marker spec (v10)

**The marker field is `christmas`, a boolean, on each video object.**

```json
{
  "title": "…",
  "artist": "…",
  "year": 1965,
  "category": "1960s",
  "youtubeId": "…",
  "description": "…",
  "christmas": true,
  "pops": [ { "at": 0.05, "text": "…" } ]
}
```

Rules for the Christmas sprint's batches/loader:

- Set `"christmas": true` on **every** song that belongs to the Christmas
  collection. Omit the field (or set `false`) for anything else.
- All other fields keep their normal Sprint 9/10 shape. `category` stays
  the release **decade** — do NOT put "Christmas" in `category`; the
  collection marker is a separate field.
- Import path is unchanged: `POST /api/videos/bulk` (raw array, ≤50 per
  call, `x-admin-key` header). As of v10 the API's sanitize step accepts
  and stores `christmas` (it also accepts the string `"true"`).
- Stored shape: Mongoose `christmas: { type: Boolean, default: false }`
  on the Video model. Unmarked songs read back as `christmas: false`.
- Read/filter: `GET /api/videos?christmas=true` returns only marked
  songs. The site's Christmas tab (`/christmas`) filters the library on
  `christmas === true`.

**⚠️ DEPLOY ORDER:** v10 must be live on Render (API + client) BEFORE the
Christmas loader runs. On the pre-v10 API the field is silently stripped
by the import sanitize step / strict schema, and the songs would land
unmarked with no error.
