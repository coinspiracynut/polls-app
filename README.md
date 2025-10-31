# polls-app

Mapping opinions &amp; beliefs across twitter &amp; bluesky

### MVP for Love Symposium Nov 14

I made a very simple websocket polling app for WordHack in NYC (https://api.omarshehata.me/live-poll) - see [video here at 28:00 - 33:00](https://youtu.be/EBeb9tLfwOo?si=JqRBai3tHkOW6RrJ&t=1708). How hard would it be to make a version where you login with twitter and click a poll option and we can see who thinks what? And have that all shuffle & updated in real time

<img width="500" height="1001" alt="image" src="https://github.com/user-attachments/assets/636ffc9f-ad8f-449a-a261-00affdeb3586" />

Steps would literally be:

- Login with twitter, get pfp
- A page where I can set a question (answers can be hard-coded to A/B/U or be configurable)
- A server that just shuffles the traffic across websockets? (doesn't actually need a database, just needs to work "live". Can take screenshots of the answers?) or can be a simple key/value store / dump it into a json
  - I think I want it to be a seemless experience while on stage, going from one question to the next. In the original "live-poll" demo I have it like a "room", and I can type, if I open the app with a secret `?admin` query param: https://api.omarshehata.me/live-poll?admin

What I intend to do with this is do an EGREGORIC ANALYSIS of the audience. Like, imagine finding questions/prompts that (1) everyone agrees on (2) everyone DISAGREES on, those are our egregore bounds. Now we can dive in, subdivide it one more level. Like I might ask "do you know that there is a comet doing weird thing called 3I/ATLAS" and see how many in the audience just learned this or already know it. And we can keep going from there.

<img width="500" height="1001" alt="image" src="https://github.com/user-attachments/assets/3d567cdb-a4b1-4f31-ae7a-ac1c03ccbe0d" />
