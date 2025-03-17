# 🎤 Karaoke Party App 🎉

## 🌟 Description

Say goodbye to those bulky karaoke songbooks and hello to the Karaoke Party App - your pocket-sized singing companion! 📱🎵

This fun and easy-to-use app is designed to make finding your favorite karaoke tunes a breeze. Whether you're at a birthday bash, a friendly get-together, or just practicing your solo in the shower, we've got you covered! 🚿🎭

### What's so great about it?
- 🔍 Find songs faster than you can say "mic check"
- 📚 Multiple song lists at your fingertips
- ❤️ Mark your go-to hits as favorites
- 🕰️ Keep track of your recently viewed songs
- 🎲 Feeling adventurous? Try our random song picker!
- 🌓 Late-night karaoke? We've got a dark mode for that

No more flipping through pages or squinting at tiny print. With the Karaoke Party App, you'll spend less time searching and more time singing. It's like having a karaoke DJ in your pocket!

So grab your imaginary mic, clear your throat, and get ready to be the star of your next karaoke night! 🎙️💖

## 🚀 How to Use

Adding new song lists to the Karaoke Party App is as easy as do-re-mi! Here's how:

1. Find the `discs.json` file in your app's main folder.
2. Open it with any text editor (like Notepad).
3. Add new song lists using this simple format:
```
{
    "file": "your_new_songlist.txt",
    "name": "Your Awesome Song List Name"
}
```

4. Save your changes and refresh the app.

Remember, each song list should be a `.txt` file in the `discs` folder. Format each song like this:
`song code | song title | artist name`

Now you're all set to host an epic karaoke party with your personalized song collections! 🎉🎵

## 🎵 Live Demo

Want to see the Karaoke Party App in action? Check out our [live demo](https://gasparmdq.github.io/karaoke-party/)!

## 🖥️ Local Testing

Want to test the app on your own computer? It's a breeze with Caddy! Just use this magic command:
```
docker run -d -p 8080:80 -v $PWD:/usr/share/caddy -v caddy_data:/data caddy
```
This will set up a local server faster than you can say "mic check"! 🎤✨
