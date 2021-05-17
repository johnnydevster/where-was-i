import React, {useCallback, useState, useEffect} from 'react';
import {useDropzone} from 'react-dropzone';
import BackToTop from 'react-back-to-top-button';
import './App.scss';
import axios from 'axios';
import { css } from "@emotion/core";
import SyncLoader from "react-spinners/SyncLoader";

const apiKey = process.env.REACT_APP_VISION_KEY

const ColorScale = require("color-scales")
let colorScale = new ColorScale(0, 100, ['#ff0000', '#00ff00', '#0000ff'])

const override = css`
  display: block;
  margin: 0 auto;
  border-color: red;
  position: absolute;
  z-index: 100;
`;

function App() {
  const [imageFile, setImageFile] = useState([]);
  const [landmarkLoading, setLandmarkLoading] = useState(false);
  const [landmarkNotFound, setLandmarkNotFound] = useState(false);
  const [landmarkInfo, setLandmarkInfo] = useState();
  const [wikiResponse, setWikiResponse] = useState();
  const [formattedSummary, setFormattedSummary] = useState();
  const [wikiLoading, setWikiLoading] = useState();

  const onDrop = useCallback(files => {
    setFormattedSummary();
    setLandmarkLoading(true);
    setLandmarkNotFound(false);
    setLandmarkInfo();
    setWikiResponse();

    files.map(file => {
      Object.assign(file, {
        preview: URL.createObjectURL(file)
      })
    })

    setImageFile(files[0]);

    const data = new FormData();
    
    data.append('file', files[0]);
    
    axios.post('/upload', data).then((response) => {
      // setImageFile([response.data]);
      setLandmarkLoading(false);
      setLandmarkInfo(response.data);
      /*
      console.log(response.data);
      */
    }).catch((error) => {
      /*
      console.error(error.response.data);
      */
      setLandmarkNotFound(true);
      setLandmarkLoading(false);
    })
  }, []);

  const {
    getRootProps, 
    getInputProps, 
    isDragActive
  } = useDropzone({
    onDrop, 
    accept: 'image/*'
  });

  // If a landmark is found, call the server and make a Wikipedia call for summary  
  useEffect(() => {
    if (landmarkInfo) {
      setWikiLoading(true);      
        axios.post('/description', {
          description: landmarkInfo.description,
          lat: landmarkInfo.lat,
          long: landmarkInfo.long
        }).then(response => {
          /*
          console.log(response.data);
          */
          setWikiResponse(response.data);

          const paragraphLimit = 4;
          
          if (response.data.summary.length > 1) {
            let summary = response.data.summary.split('. ');
            let firstParagraphs = summary.slice(0, -1);
            let lastParagraph = summary.slice(-1)[0];

            let formattedSummary = firstParagraphs.map(item => {
              return `${item}.`
            })
            formattedSummary.push(lastParagraph);
            setFormattedSummary(formattedSummary.slice(0, paragraphLimit))
          } 
          
          else {
            setFormattedSummary(response.data.summary);
          }

          setWikiLoading(false);
        }).catch(error => {
          console.log(error);
          console.log('Failed to get info from Wikipedia.');
          setWikiLoading(false);
        })
    }
  }, [landmarkInfo])

  function LandmarkInfo() {
    if (landmarkInfo) {
      const spanStyle = {
        color: `${colorScale.getColor(Math.round(landmarkInfo.confidence * 100)).toHexString()}`
      }
      

      return (
        <div className="landmarkinfo">
          <p>Looks like you were at the <span>{landmarkInfo.description}</span>.</p>
          <p>Our confidence rating is <span style={spanStyle}>{Math.round(landmarkInfo.confidence * 100) + '%'}</span></p>
        </div>
      )
    } else {
      return null
    }
  }

  function WikipediaInfo() {
    if (formattedSummary) {
      return (
        <div className="wikipediainfo">
          <div className="wikisummary">
            {formattedSummary.map(paragraph => {
              return <p>{paragraph}</p>
            })}
            <a href={wikiResponse.url} target="_blank" rel="noreferrer">Info provided by Wikipedia</a>
          </div>
          <div className="wikiimg">
            <img alt={`${landmarkInfo.description}`} src={wikiResponse.image} />
          </div>
        </div>
      )
    }
    if (wikiLoading) {
      return <div className="wikiloading"><SyncLoader color="#8060ff" loading={true} css={override} size={12} /></div>
    }
    return null;
  }

  function MapDisplay() {
    if (landmarkInfo) {
      const zoomLevel = 12;
      // Zoomlevel is a value between 0 (the whole world) and 21 (individual buildings)
      const mapsUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${landmarkInfo.lat+','+landmarkInfo.long}&center=${landmarkInfo.lat+','+landmarkInfo.long}&zoom=${zoomLevel}`
      return (
        <iframe title="googlemaps" className="maps" frameborder="0" src={mapsUrl}></iframe>
      )
    }
    return null;
  }

  return (
    <div className="App">
      
      <header>
        <h1>... where was I?</h1>
      </header>
      <div className="main">
      <BackToTop 
        showAt={500}
        speed={300}
        easing={"easeInOutQuint"}
        >
        <i className="fas fa-arrow-circle-up"></i>
        </BackToTop>
        <div className="drop-main">
          <div className="herocontent">
            <p>Have you ever been on vacation, gotten a bunch of cool pictures, but <strong>totally forgotten where you were?</strong><br/><br/>
            </p>
            <span>No worries!</span>
          </div>
          <div className="textcontent">
            <h3>We've got a mainline hooked straight into Google's Vision API.</h3>
            <p>Simply drag and drop a picture containing a landmark below and we'll try to guess where it is!</p>
          </div>
          <div className="dropwindow" {...getRootProps()}>
            <input {...getInputProps()} />
            {
              isDragActive ?
                <p>Drop the files here ...</p> :
                <p>Drag 'n' drop an image here, or click to select</p>
            }
          </div>
          <div className="imagecontainer">
            <SyncLoader color="#8060ff" loading={landmarkLoading} css={override} size={12} />
            <img className={landmarkLoading ? 'landmarkloading' : ''} src={imageFile.preview} />
          </div>
          {landmarkNotFound ? <div className="notfound"><p>Sorry, seems like we couldn't find any landmarks in this picture. Try another one!</p></div> :null}
          <LandmarkInfo />
          <WikipediaInfo />
          <MapDisplay />
        </div>
      </div>
    </div>
  );
}

export default App;
