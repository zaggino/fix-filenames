#fix-filenames

node command line tool to rename non ascii (code > 127) characters in files to ascii ones

useful for renaming greek, czech, slovak files (in my case .mp3) to standard ascii (english alphabet) letters

character mapping can be found in the [codemap](codemap.js)

##install

```
npm install -g fix-filenames
```

##usage

to do a test run:

```
fix-filenames
```

to actually rename files:

```
fix-filenames --rename
```
