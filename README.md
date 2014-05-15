udstoryd
========

photo scraper daemon for the University of Dayton 2014 project


## Requirements
````
# Install ExtUtils/MakeMaker.pm (needed by exiftool)
yum install cpan
cpan App::cpanminus

# Install Exiftool
wget http://www.sno.phy.queensu.ca/~phil/exiftool/Image-ExifTool-9.59.tar.gz
tar -xvf Image-ExifTool-9.59.tar.gz
cd Image-ExifTool-9.59
perl Makefile.PL
make test
sudo make install

# Install GraphicsMagick-1.3.19
wget http://downloads.sourceforge.net/project/graphicsmagick/graphicsmagick/1.3.19/GraphicsMagick-1.3.19.tar.gz
tar -xvf GraphicsMagick-1.3.19.tar.gz
cd GraphicsMagick-1.3.19
./configure
make
make install

````


## Useful Links
- [Strategy for catching all tweets with a given hashtag](https://dev.twitter.com/discussions/28068)