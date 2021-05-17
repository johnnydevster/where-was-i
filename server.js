const express = require('express');
const app = express();
const vision = require('@google-cloud/vision');
const multer = require('multer');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const wiki = require('wikijs').default;
const stringSimilarity = require('string-similarity');
const path = require('path');

app.use(cors())
app.use(express.json())

const wikiTestMode = false;
const landmarkTestMode = false;

const server = http.createServer(app);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'pictures')
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' +file.originalname)
    }
  })
  
const upload = multer({ storage: storage }).single('file')

//Google Vision API
const client = new vision.ImageAnnotatorClient({
    keyFilename: './env/apikey.json'
});

async function landmarkSearch(path) {
  // Performs landmark detection on image file

    const [result] = await client.landmarkDetection(`./pictures/${path}`);
    const landmarks = result.landmarkAnnotations;

    console.log('Landmarks:');
    landmarks.forEach(landmark => {
      console.log('Place: ' + landmark.description);
      console.log('Confidence factor: ' + landmark.score);
      console.log('Latitude: ' + landmark.locations[0]['latLng']['latitude']);
      console.log('Longitude: ' + landmark.locations[0]['latLng']['longitude']);
    });
    fs.unlink(`./pictures/${path}`, (err) => {
      if (err) {
        console.error(err);
        return
      }
    });

    return {
      description: landmarks[0].description,
      confidence: landmarks[0].score,
      lat: landmarks[0].locations[0]['latLng']['latitude'],
      long: landmarks[0].locations[0]['latLng']['longitude']
    }
}

async function wikipediaSearch(searchTerm, lat, long) {
  const geoSearch = await wiki().geoSearch(lat, long, 10000, 20);
  
  console.log('Found pages: ');
  console.log(geoSearch);

  const bestMatch = stringSimilarity.findBestMatch(searchTerm, geoSearch).bestMatch.target;

  console.log('Search term: ' + searchTerm);
  console.log('Best match: ' + bestMatch);
  
  const search = await wiki().page(bestMatch);
  const summary = await search.summary();
  const image = await search.mainImage();
  const url = await search.url();

  return {
    summary: summary,
    image: image,
    url: url
  };
}

/*
wikipediaSearch('Palatine Museum on Palatine Hill', 41.888436, 12.487105)
res.send({description: 'High Roller', confidence: 0.5, lat: 36.1176372, long: -115.16820229999999});
{description: 'Grand Canyon', confidence: 0.8, lat: 36.3, long: -112.6}
{description: 'London Eye', confidence: 0.9, lat: 51.5033, long: -0.1194}
{description: 'Oxford University', confidence: 0.3, lat: 51.755, long: -1.255}
{summary: `The University of Oxford is a collegiate research university in Oxford, England. There is evidence of teaching as early as 1096, making it the oldest university in the English-speaking world, the world's second-oldest university in continuous operation and one of the most prestigious academic institutions in the world. It grew rapidly from 1167 when Henry II banned English students from attending the University of Paris. After disputes between students and Oxford townsfolk in 1209, some academics fled north-east to Cambridge where they established what became the University of Cambridge. The two English ancient universities share many common features and are jointly referred to as Oxbridge. The university is made up of thirty-nine semi-autonomous constituent colleges, six permanent private halls, and a range of academic departments which are organised into four divisions. All the colleges are self-governing institutions within the university, each controlling its own membership and with its own internal structure and activities. All students are members of a college. It does not have a main campus, and its buildings and facilities are scattered throughout the city centre. Undergraduate teaching at Oxford is organised around weekly small-group tutorials at the colleges and halls – a feature unique to the Oxbridge system. These are supported by classes, lectures, seminars, laboratory work and occasionally further tutorials provided by the central university faculties and departments. Postgraduate teaching is provided predominantly centrally. Oxford operates the world's oldest university museum, as well as the largest university press in the world and the largest academic library system nationwide. In the fiscal year ending 31 July 2019, the university had a total income of £2.45 billion, of which £624.8 million was from research grants and contracts.Oxford has educated a wide range of notable alumni, including 28 prime ministers of the United Kingdom and many heads of state and government around the world. As of October 2020, 72 Nobel Prize laureates, 3 Fields Medalists, and 6 Turing Award winners have studied, worked, or held visiting fellowships at the University of Oxford, while its alumni have won 160 Olympic medals. Oxford is the home of numerous scholarships, including the Rhodes Scholarship, one of the oldest international graduate scholarship programmes.`, 
image: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Coat_of_arms_of_the_University_of_Oxford.svg',
url: 'https://cdn.getyourguide.com/img/location/5c10eb21206c9.jpeg/88.jpg'}

{summary: `Big Ben is the nickname for the Great Bell of the striking clock at the north end of the Palace of Westminster;[1] the name is frequently extended to refer to both the clock and the clock tower.[2] The official name of the tower in which Big Ben is located was originally the Clock Tower; it was renamed Elizabeth Tower in 2012 to mark the Diamond Jubilee of Elizabeth II, Queen of the United Kingdom.
    The tower was designed by Augustus Pugin in a neo-Gothic style. When completed in 1859, its clock was the largest and most accurate four-faced striking and chiming clock in the world.[3] The tower stands 316 feet (96 m) tall, and the climb from ground level to the belfry is 334 steps. Its base is square, measuring 40 feet (12 m) on each side. Dials of the clock are 22.5 feet (6.9 m) in diameter. All four nations of the UK are represented on the tower in shields featuring a rose for England, thistle for Scotland, shamrock for Northern Ireland, and leek for Wales. On 31 May 2009, celebrations were held to mark the tower's 150th anniversary.[4]
    Big Ben is the largest of the tower's five bells and weighs 13.5 long tons (13.7 tonnes; 15.1 short tons).[1] It was the largest bell in the United Kingdom for 23 years. The origin of the bell's nickname is open to question; it may be named after Sir Benjamin Hall, who oversaw its installation, or heavyweight boxing champion Benjamin Caunt. Four quarter bells chime at 15, 30 and 45 minutes past the hour and just before Big Ben tolls on the hour. The clock uses its original Victorian mechanism, but an electric motor can be used as a backup.
    The tower is a British cultural icon recognised all over the world. It is one of the most prominent symbols of the United Kingdom and parliamentary democracy,[5] and it is often used in the establishing shot of films set in London.[6] The clock tower has been part of a Grade I listed building since 1970 and a UNESCO World Heritage Site since 1987.
    On 21 August 2017, a four-year schedule of renovation works began on the tower. Modifications will include adding a lift, re-glazing and repainting the clock dials, upgrading lighting and repairing roof tiles among other improvements. With a few exceptions, such as New Year's Eve and Remembrance Sunday, the bells are to be silent until the work is completed in 2022.[7]`, 
    image: `https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Clock_Tower_-_Palace_of_Westminster%2C_London_-_May_2007.jpg/800px-Clock_Tower_-_Palace_of_Westminster%2C_London_-_May_2007.jpg`}
{description: 'Grand Canyon National Park', confidence: 0.5, lat: 36.1069652, long: -112.1129972}
    */



app.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.sendStatus(500);
      console.log(err);
    }

    if (landmarkTestMode) {
      // Send dummy data if test mode is active
      res.send( {description: 'Grand Canyon National Park', confidence: 0.5, lat: 36.1069652, long: -112.1129972} );
    }

    else {
      landmarkSearch(req['file'].filename).then(response => {
        res.status(200).send(response);
      }).catch((error) => {
        res.status(403).send('Couldn\'t find any landmarks.');
        console.error(error);
      });
    }
  });
});

app.post('/description', (req, res) => {
  if (wikiTestMode) {
    // Send dummy data if test mode is active
  res.status(200).send({summary: `The University of Oxford is a collegiate research university in Oxford, England. There is evidence of teaching as early as 1096, making it the oldest university in the English-speaking world, the world's second-oldest university in continuous operation and one of the most prestigious academic institutions in the world. It grew rapidly from 1167 when Henry II banned English students from attending the University of Paris. After disputes between students and Oxford townsfolk in 1209, some academics fled north-east to Cambridge where they established what became the University of Cambridge. The two English ancient universities share many common features and are jointly referred to as Oxbridge. The university is made up of thirty-nine semi-autonomous constituent colleges, six permanent private halls, and a range of academic departments which are organised into four divisions. All the colleges are self-governing institutions within the university, each controlling its own membership and with its own internal structure and activities. All students are members of a college. It does not have a main campus, and its buildings and facilities are scattered throughout the city centre. Undergraduate teaching at Oxford is organised around weekly small-group tutorials at the colleges and halls – a feature unique to the Oxbridge system. These are supported by classes, lectures, seminars, laboratory work and occasionally further tutorials provided by the central university faculties and departments. Postgraduate teaching is provided predominantly centrally. Oxford operates the world's oldest university museum, as well as the largest university press in the world and the largest academic library system nationwide. In the fiscal year ending 31 July 2019, the university had a total income of £2.45 billion, of which £624.8 million was from research grants and contracts.Oxford has educated a wide range of notable alumni, including 28 prime ministers of the United Kingdom and many heads of state and government around the world. As of October 2020, 72 Nobel Prize laureates, 3 Fields Medalists, and 6 Turing Award winners have studied, worked, or held visiting fellowships at the University of Oxford, while its alumni have won 160 Olympic medals. Oxford is the home of numerous scholarships, including the Rhodes Scholarship, one of the oldest international graduate scholarship programmes.`, 
image: 'https://cdn.getyourguide.com/img/location/5c10eb21206c9.jpeg/88.jpg',
url: 'https://en.wikipedia.org/wiki/University_of_Oxford'});
  } 
  
  else {
    wikipediaSearch(req.body.description, req.body.lat, req.body.long).then(response => {
      res.status(200).send(response);
    }).catch(error => {
      res.status(403).send('No landmark info available.')
      console.log(error);
    });
  }
});

app.use(express.static(path.join(__dirname, 'client/build')));

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

server.listen(process.env.PORT || 5000);