# Testing Requirements (Section 19)

Run through the deployed Netlify UI, then verify in MongoDB Atlas.

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 1 | Add Student | Add Student page: ST101, Rahul Sharma, rahul@example.com, CSE, Sem 5 | Toast "Student added successfully" | |
| 2 | Display Students | Student List page (API: `GET /api/students`) | All stored records shown | |
| 3 | Update Student | Edit ST101, change semester 5 -> 6, Save | Toast "Student updated successfully"; list shows Sem 6 | |
| 4 | Delete Student | Delete ST101, confirm | Toast "Student deleted successfully"; row gone | |
| 5 | Database Verification | Atlas -> Browse Collections -> studentDB.students | Document state matches each UI action above (added, semester 6, then removed) | |

## Extra checks
- Search "rahul" on Search page returns the record.
- Add duplicate ST101 -> error "A student with this Student ID already exists".
- Invalid email / semester 99 -> validation message.
- `curl -H "Origin: https://evil.example" -X OPTIONS <API>/api/students` -> no CORS approval.
- Browser DevTools -> Network: requests go to the `onrender.com` URL, and no MongoDB URI appears anywhere in the frontend source.
