'use client'
import Image from "next/image";
import { useState, useEffect, forwardRef, useRef } from "react";
import { firestore, firebase_storage } from "@/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Box, Button, Modal, Stack, TextField, Typography, AppBar, InputAdornment, createTheme, ThemeProvider, Popper } from "@mui/material";
import { Unstable_NumberInput as BaseNumberInput } from '@mui/base/Unstable_NumberInput';
import { styled } from '@mui/system';
import IconButton from '@mui/material/IconButton';

import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CameraEnhanceIcon from '@mui/icons-material/CameraEnhance';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';
import SearchIcon from '@mui/icons-material/Search';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

import { collection, query, getDocs, setDoc, doc, deleteDoc, getDoc } from "firebase/firestore";

import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';

import BeeHiveImg from "../assets/bee_hive_orange.png";
import BeeHiveOutline from "../assets/bee_hive.png";
import {Camera} from "react-camera-pro";
import { orange } from "@mui/material/colors";

import ReactFileReader from "react-file-reader";



export default function Home() {
  // inside the parentheses of useSate is the default value
  // the first returned value is the variable with the default value
  // the second is the setter function for the variable
  const [inventory, setInventory] = useState([])
  const [openForm, setOpenForm] = useState(false)
  const [itemName, setItemName] = useState('')  
  const [itemCount, setItemCount] = useState(1)  
  const [searchName, setSearchName] = useState('')  
  // store a record of full inventory to come back after a search without need to query the database again
  const [fullInventory, setFullInventory] = useState([])
  const [fullInventoryMap, setFullInventoryMap] = useState({})

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openCamera, setOpenCamera] = useState(false)

  const camera = useRef(null);
  const [numberOfCameras, setNumberOfCameras] = useState(0);
  const [photo, setPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [openPhoto, setOpenPhoto] = useState(false);

  const [anchorEl, setAnchorEl] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);

  const handleMouseEnterRow = (event, item) => {
    if (item.photo_url) {
      setAnchorEl(event.currentTarget);
      setHoveredItem(item);
    }
  };

  const handleMouseLeaveRow = () => {
    setAnchorEl(null);
    setHoveredItem(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const updateInventory = async () => {
    const snapshot = query(collection(firestore, 'inventory'))
    const docs = await getDocs(snapshot)
    const inventoryList = []
    const inventoryMap = {}
    docs.forEach((doc) => {
      const info = {
        name: doc.id,
        ...doc.data()
      }
      inventoryList.push(info)
      inventoryMap[doc.id] = info
      })
    setFullInventory(inventoryList)
    setFullInventoryMap(inventoryMap)
    setInventory(inventoryList)
  }

  const searchInventory = async (searchString) => {
    // const inventoryRef = collection(firestore, 'inventory')
    // const searchQuery = query(inventoryRef, where('__name__', '==', searchString.toLowerCase()))
    
    // const docs = await getDocs(searchQuery)
    // const searchResults = []
    
    // docs.forEach((doc) => {
    //   console.log("found 1");
    //   searchResults.push({
    //     name: doc.id,
    //     ...doc.data()
    //   })
    // })

    const searchResults = []
    fullInventory.forEach((item) => {
      if (item.name.includes(searchString.toLowerCase())) {
        searchResults.push(item)
      }
    })
    setInventory(searchResults)
  }

  const reduceItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const {quantity} = docSnap.data()
      if (quantity === 1) {
        await deleteDoc(docRef)
      } else {
        await setDoc(docRef, {quantity: quantity - 1})
      }
    }
    await updateInventory()
  }

  const deleteItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      await deleteDoc(docRef)
    }
    await updateInventory()
  }

  const updateItem = async (name, quantityChange, itemPhoto, itemPhotoFile) => {
    const docRef = doc(collection(firestore, 'inventory'), name.toLowerCase())
    const docSnap = await getDoc(docRef)
    let fileUrl = null;
    let photoName = null;
    let photoType = null;
    if (itemPhoto) {
      if (itemPhotoFile) {
        photoName = itemPhotoFile.name;
        photoType = itemPhotoFile.type; // 'image/png' or 'image/jpg'
      } else { // photo took by camera
        photoName = name;
        photoType = 'image/jpeg';
      }
      const fileRef = ref(firebase_storage, `images/${photoName}`);
      const metadata = {
        contentType: photoType, // avoid firebase storage link to automatic download the image
      };
      await uploadBytes(fileRef, itemPhoto, metadata);
      fileUrl = await getDownloadURL(fileRef);
    }
      const quantity = docSnap.exists() ? docSnap.data().quantity : 0
      const total = quantity + quantityChange

      if (total > 0) {
        const docData = { quantity: total };
        if (itemPhoto) {
          docData.photo_url = fileUrl;
          docData.photo_name = photoName;
        }
        await setDoc(docRef, docData, { merge: true });
      } else {
        await deleteDoc(docRef);
      }

    await updateInventory()
    setItemName('')
    setItemCount(1)
    setPhoto(null)
    setPhotoFile(null)
    setPhotoPreview(null)
    handleCloseForm()
  }

  // what is the least number to be added, or highest number that can be subtracted
  const findItemMinCount = (itemName) => {
    let item = fullInventoryMap[itemName]
    return item ? -item['quantity']: 1;
  }

  // call the function whever the dependency list (second parameter)changes
  // when an empty list is given, useEffect will only call the function once
  // at the very beginning when the page loads
  useEffect(() => {
    updateInventory()
  }, [])

  const handleOpenForm = () => setOpenForm(true)
  const handleCloseForm = () => setOpenForm(false)
  const handleOpenCamera = () => setOpenCamera(true)
  const handleCloseCamera = () => setOpenCamera(false)
  const handleOpenPhoto = () => setOpenPhoto(true)
  const handleClosePhoto = () => setOpenPhoto(false)

  const handleFiles = (files) => {
    // setUrl(files.base64);
    // setPhoto(files[0]['name']);
    // handleOpenPhoto();
    
    const file = files[0];
    setPhoto(file);
    setPhotoFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file); // base63

    // if (files && files.base64) {
    //   setPhoto(files.base64);
    //   setPhotoFile(files.fileList[0])
    // }
  };

  const handleCancelFile = () => {
    setPhoto(null);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const base64ToBlob = (base64Data, contentType) => {
    const byteCharacters = atob(base64Data.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  };


  return (
    // justifyContent centers horizontally, alignItems centers vertically
    <Box 
      width='100vw' 
      // height='100vh' 
      display='flex' 
      justifyContent='center' 
      alignItems='center' 
      gap={2}
      flexDirection={'column'}
      bgcolor={'#fcfbf5'}
      >

      {/* pop up window for changing inventory in batch */}
      <Modal open={openForm} onClose={handleCloseForm}>
        <StyledPopUP 
          position='absolute' 
          top='50%' 
          left='50%' 
          width='40%' 
          bgcolor='white' 
          border='5px solid #e8b40a' 
          borderRadius={5}
          boxShadow={24} p={4} 
          display={'flex'} 
          flexDirection={'column'} 
          gap={3}
          sx={{
            transform: 'translate(-50%, -50%)'
          }}>
          <Typography variant="h6"> Update Information of an Item </Typography>
          <Stack width='100%' direction='row' spacing={2} alignItems={'center'}>
            <Box width={200}>
              <Typography variant="p"> Item Name* : </Typography>
            </Box>
            
            <StyledTextField
              variant='outlined'
              // fullWidth
              size="small"
              label="Name"
              placeholder="Enter item name here ..."
              sx={{ width: '25ch' }}
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value)
              }}
            />
          </Stack>
          <Stack width='100%' direction='row' spacing={2} alignItems={'center'}>
            <Box width={200}>
              <Typography variant="p"> Item Count : </Typography>
            </Box>
            
            <NumberInput
              min={findItemMinCount(itemName)}
              value={itemCount}
              onChange={(event, val) => {
                setItemCount(val)
              }}
            />
          </Stack>
          <Stack width='100%' direction='row' spacing={2} alignItems={'center'}>
            <Box width={200}>
              <Typography variant="p"> Item Photo : </Typography>
            </Box>
            <ThemeProvider theme={orange_theme}>
              <Button color='primary' variant='outlined' onClick={() => handleOpenCamera()}>
                <PhotoCameraIcon />
              </Button>
              <Typography variant='p' sx={{mx: '5px'}}> or </Typography> 
              <ReactFileReader
                fileTypes={[".png", ".jpg"]}
                handleFiles={handleFiles}
              >
                <Button color='primary' variant='outlined'>
                  <FileUploadIcon/>
                </Button>
              </ReactFileReader>
            </ThemeProvider>
          </Stack>
          {photoPreview && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={photoPreview} alt="Photo Preview" style={{ width: 'auto', height: '100px'}} onClick={handleOpenPhoto}/>
                    <IconButton
                      onClick={handleCancelFile}
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        // backgroundColor: 'white',
                        padding: '2px',
                      }}
                    >
                      <HighlightOffIcon style={{ fontSize: '30px' }} />
                    </IconButton>
                </div>
                
              </div>
            )}
          <ThemeProvider theme={orange_theme}>
            <Button
                variant="outlined"
                color='primary'
                disabled={itemName === '' ||(itemCount === 0 && !photo)}
                onClick={()=>{
                  updateItem(itemName, itemCount, photo, photoFile)
                }}
              >
                Update
            </Button>
          </ThemeProvider>
        </StyledPopUP>
      </Modal>

      {/* pop up window for camera */}
      <Modal open={openCamera} onClose={handleCloseCamera}>
        <StyledPopUP 
          position='absolute' 
          top='50%' 
          left='50%' 
          width='70%'
          height='90%'
          bgcolor='white' 
          border='5px solid #e8b40a' 
          boxShadow={24} //p={4} 
          display={'flex'} 
          flexDirection={'column'} 
          gap={3}
          sx={{
            transform: 'translate(-50%, -50%)'
          }}>
          <Stack direction='column' spacing={2} width='100%' height='100%'>
            <Box 
              position='relative'
              width='100%'
              height='90%'
              >
              <Camera ref={camera} numberOfCamerasCallback={setNumberOfCameras} />
            </Box>
            <Stack direction='row' spacing={2} justifyContent='space-evenly'>
            <ThemeProvider theme={orange_theme}> 
              <Button 
                fullWidth
                variant='outlined' 
                color='primary'
                onClick={() => {
                  const itemPhoto = camera.current.takePhoto(); // base64 jpeg 
                  setPhoto(base64ToBlob(itemPhoto, 'image/jpeg'));
                  setPhotoPreview(itemPhoto);
                  handleOpenPhoto();
                  handleCloseCamera();
              }}> 
                <CameraEnhanceIcon/> <StyledCameraText sx={{ml: 5}}>Take a Photo</StyledCameraText>
              </Button>
              <Button 
                fullWidth
                variant='outlined' 
                color='primary'
                disabled={numberOfCameras <= 1}
                onClick={() => {
                camera.current.switchCamera();
                }}> 
                <FlipCameraIosIcon/> <StyledCameraText sx={{ml: 5}}>Flip Camera</StyledCameraText>
              </Button>
            </ThemeProvider>
              
            </Stack>
          </Stack>
        </StyledPopUP>
      </Modal>

      {/* pop up window for showing the photo taken */}
      <Modal open={openPhoto} onClose={handleClosePhoto}>
        <Box 
          position='absolute' 
          top='50%' 
          left='50%' 
          bgcolor='white' 
          border='5px solid #e8b40a' 
          boxShadow={24} 
          display={'flex'} 
          sx={{
            transform: 'translate(-50%, -50%)'
          }}>
          <img src={photoPreview} alt='Photo preview' onClick={handleClosePhoto} height='300' width='auto'/>
        </Box>
      </Modal>
      
      <AppBar 
        position="fixed"
        // className={classes.header}
        sx={{ borderBottom: '3px solid #feba07',
              // background: ' url(https://pics.freeicons.io/uploads/icons/png/162973900016366494065382-512.png) -20px -20px/200px 200px, linear-gradient(to right, #000000, #feba07)'
              background: 'linear-gradient(to right, #000000, #feba07)'
            }} 
        style={{display: 'inline-block'}}>
        <Image src={BeeHiveImg} alt='site_logo' height={50} width={50} style={{marginTop: '15px', marginLeft: '10px'}}/>
        {/* <Stack display={'flex'} flexDirection={'row'} alignItems={'flex-end'}> */}
        <Typography 
          variant="h3" 
          color='#FFD700' 
          style={{display: 'inline-block'}} 
          paddingX={1}>
            Hive.it
        </Typography>
        <StyledSubtitleText variant='p' color='#FFD700'>Inventory Management System</StyledSubtitleText>
        {/* </Stack> */}
        
        <StyledImage src={BeeHiveOutline} alt='background bee hive'/>
      </AppBar>

      <Box marginTop={20} width='80vw' alignItems={'center'} justifyContent={'center'} display={'flex'}>
        <StyledTextField
          variant='outlined'
          sx={{ marginRight: 2, width: '60%' }}
          size="small"
          label="Search"
          placeholder="Enter item name here ..."
          value={searchName}
          onChange={(e) => {
            // if user deleted everything in searchbox then go back to full list 
            if (e.target.value == '') {
              setInventory(fullInventory)
            }
            setSearchName(e.target.value);
          }}
          onKeyDown={(k) => {
            if (k.key === 'Enter') {
              searchInventory(searchName)
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        {/* <Button variant='outlined' onClick={() => searchInventory(searchName)} sx={{ marginRight: 5}}>
          <SearchIcon/>
        </Button> */}
        {/* <ThemeProvider theme={orange_theme}>
          <Button color='primary' variant='outlined' onClick={() => handleOpenCamera()}>
            <PhotoCameraIcon />
          </Button>
        </ThemeProvider> */}
      </Box>

      <StyledPaper sx={{ width: '80%', overflow: 'hidden'}} elevation={10}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                  <TableCell key='name' align="left" >
                    <Typography variant="h6" color='#333'>Item Name</Typography>
                  </TableCell>
                  <TableCell key='count' align="center">
                    <Typography variant="h6" color='#333'>Count</Typography>
                  </TableCell>
                  <TableCell key='action' align="right">
                    <Typography variant="h6" color='#333'>Actions</Typography>
                  </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((item) => {
                  return (
                    <StyledTableRow 
                      hover={true} 
                      key={item.name}
                      onMouseEnter={(event) => handleMouseEnterRow(event, item)}
                      onMouseLeave={handleMouseLeaveRow}>
                      <TableCell>
                        <Typography variant="body1" color='#333'>{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body1" color='#333'>{item.quantity}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction='row' spacing={2} justifyContent={'flex-end'}>
                          <StyledButton 
                            onClick={() => {updateItem(item.name, 1, null, null)}}>
                            <AddIcon/>
                          </StyledButton>
                          <StyledButton onClick={() => {updateItem(item.name, -1, null, null)}}>
                            <RemoveIcon/>
                          </StyledButton>
                          <StyledButton onClick={() => deleteItem(item.name)}>
                            <DeleteForeverIcon/>
                          </StyledButton>
                        </Stack>
                      </TableCell>
                    </StyledTableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 100]}
        component="div"
        count={inventory.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </StyledPaper>
    {hoveredItem && (
        <Popper
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          placement="left"
          style={{ zIndex: 10 }}
        >
          <img src={hoveredItem.photo_url} alt={hoveredItem.name} width='100' height='auto' border='5px solid #e8b40a'/>
        </Popper>
    )}
      {/* <Box border='1px solid #333'>
        <Stack
          width='80vw'
          height='500px'
          // spacing={2}
          overflow='auto'
        >
          {
            inventory.map(({name, quantity}) => (
              <StyledBox 
                key={name}
                width='100%'
                minHeight='50px'
                display={'flex'}
                alignItems='center'
                justifyContent='space-between'
                // bgcolor='#e9ddb6'
                padding={5}
              >
                <Typography
                  variant="h6"
                  color='#333'
                  textAlign='center'>
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                </Typography>
                <Typography
                  variant="h6"
                  color='#333'
                  textAlign='center'>
                    {quantity}
                </Typography>
                <Stack direction='row' spacing={2} alignItems={'center'}>
                  <StyledButton variant='contained' onClick={() => addItem(name, 1)}>
                    <AddIcon/>
                  </StyledButton>
                  <StyledButton variant='contained' onClick={() => reduceItem(name)}>
                    <RemoveIcon/>
                  </StyledButton>
                  <StyledButton variant='contained' onClick={() => deleteItem(name)}>
                    <DeleteForeverIcon/>
                  </StyledButton>
                </Stack>
              </StyledBox>
            ))
          }
        </Stack>
      </Box> */}
      <ThemeProvider theme={orange_theme}>
        <Button
        variant="outlined"
        color='primary'
        sx={{marginTop: 1, px: '20px', borderColor: '#1C2025', borderWidth: '1px'}}
        // paddingX='10px'
        onClick={() => {
          handleOpenForm()
        }}
        >
          Update Inventory
        </Button>
      </ThemeProvider>
      

      <Box sx={{marginTop : '10%', bottom: 0}} bgcolor={orange[200]} display={'flex'} width={'100vw'} justifyContent='center'>
        <Typography>Copyright © 2024 Weijia Xiao. All rights reserved.</Typography> 
      </Box>
    </Box>
  );
}


// customize number input 
const NumberInput = forwardRef(function CustomNumberInput(props, ref) {
  return (
    <BaseNumberInput
      slots={{
        root: StyledInputRoot,
        input: StyledInput,
        incrementButton: StyledButton,
        decrementButton: StyledButton,
      }}
      slotProps={{
        incrementButton: {
          children: <AddIcon fontSize="small" />,
          className: 'increment',
        },
        decrementButton: {
          children: <RemoveIcon fontSize="small" />,
        },
      }}
      {...props}
      ref={ref}
    />
  );
});

const orange_pallete = {
  100: '#fdf5da',
  200: '#fae291',
  300: '#f9db79',
  400: '#f8d560',
  500: '#f7ce48',
  600: '#f6c730',
  700: '#f5c117',
  800: '#e8b40a',
};

const createColor = (mainColor) => createTheme()({ color: { main: mainColor } });
const orange_theme = createTheme({
  palette: {
    // light: '#fdf5da',
    // secondary: '#fae291',
    // main: '#f9db79',
    // primary: '#f8d560',
    // orange_500: '#f7ce48',
    // orange_600: '#f6c730',
    // dark: '#f5c117',
    // orange_800: '#e8b40a',
    // contrastText: '#fff',
    primary: orange
  },
});

const grey = {
  50: '#F3F6F9',
  100: '#E5EAF2',
  200: '#DAE2ED',
  300: '#C7D0DD',
  400: '#B0B8C4',
  500: '#9DA8B7',
  600: '#6B7A90',
  700: '#434D5B',
  800: '#303740',
  900: '#1C2025',
};

const StyledInputRoot = styled('div')(
  ({ theme }) => `
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 400;
  color: ${theme.palette.mode === 'dark' ? grey[300] : grey[500]};
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;`,
);

const StyledInput = styled('input')(
  ({ theme }) => `
  font-size: 0.875rem;
  font-family: inherit;
  font-weight: 400;
  line-height: 1.375;
  color: ${theme.palette.mode === 'dark' ? grey[300] : grey[900]};
  background: ${theme.palette.mode === 'dark' ? grey[900] : '#fff'};
  border: 1px solid ${theme.palette.mode === 'dark' ? grey[700] : grey[200]};
  box-shadow: 0px 2px 4px ${
    theme.palette.mode === 'dark' ? 'rgba(0,0,0, 0.5)' : 'rgba(0,0,0, 0.05)'
  };
  border-radius: 8px;
  margin: 0 8px;
  padding: 10px 12px;
  outline: 0;
  min-width: 0;
  width: 10rem;
  text-align: center;

  &:hover {
    border-color: ${orange[400]};
  }

  &:focus {
    border-color: ${orange[400]};
    box-shadow: 0 0 0 3px ${theme.palette.mode === 'dark' ? orange[700] : orange[200]};
  }

  &:focus-visible {
    outline: 0;
  }`,
);

const StyledButton = styled('button')(
  ({ theme }) => `
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.875rem;
  box-sizing: border-box;
  line-height: 1.5;
  border: 1px solid;
  border-radius: 999px;
  border-color: ${theme.palette.mode === 'dark' ? grey[800] : grey[200]};
  background: ${theme.palette.mode === 'dark' ? grey[900] : grey[50]};
  color: ${theme.palette.mode === 'dark' ? grey[200] : grey[900]};
  width: 32px;
  height: 32px;
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
  align-items: center;
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 120ms;

  &:hover {
    cursor: pointer;
    background: ${theme.palette.mode === 'dark' ? orange[700] : orange[500]};
    border-color: ${theme.palette.mode === 'dark' ? orange[500] : orange[400]};
    color: ${grey[50]};
  }

  &:focus-visible {
    outline: 0;
  }

  &.increment {
    order: 1;
  }
`,
);

// make the background color in the table different for odd number and even number rows
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:hover": {
    backgroundColor: "#f5c67d !important"
  },
  '&:nth-of-type(odd)': {
    backgroundColor: "#f5efdd",
  },
  '&:nth-of-type(even)': {
    backgroundColor: "#f9f9f9",
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '&:hover fieldset' : {
    borderColor: orange[400]
  },

  '&:focus fieldset' : {
    borderColor: orange[200],
    boxShadow: `0 0 0 3px ${theme.palette.mode === 'dark' ? orange[700] : orange[200]}`
  }, 
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: orange[600], // Default border color
    },
    '&:hover fieldset': {
      borderColor: orange[400], // Hover border color
    },
    '&.Mui-focused fieldset': {
      borderColor: orange[200], // Focused border color
    },
  },
}));

// AppBar background image of bee hive outline
const StyledImage = styled(Image)(({ theme }) => ({
  height: '100%',
  width: 'auto',
  position: 'absolute',
  right: -10,
  top: 0,
  bottom: 0,
  objectFit: 'cover',
  pointerEvents: 'none',
  [theme.breakpoints.down("sm")]: {
    display: "none",
  }
}));

const StyledPopUP = styled(Box)(({ theme }) => ({
  [theme.breakpoints.down("lg")]: {
    width: '60vw',
  },
  [theme.breakpoints.down("md")]: {
    width: '80vw',
  },
  [theme.breakpoints.down("sm")]: {
    width: '100vw',
  }
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  [theme.breakpoints.down("sm")]: {
    width: '100vw',
  }
}));

const StyledCameraText = styled(Typography)(({ theme }) => ({
  [theme.breakpoints.down("sm")]: {
    display: 'none'
  }
}));

const StyledSubtitleText = styled(Typography)(({ theme }) => ({
  [theme.breakpoints.down("sm")]: {
    display: 'block',
    marginLeft: '70px',
    marginTop: '0px',
    paddingTop: '0px'
  }
}));