#!/bin/sh

make clean ;

echo "INSTALL NODEFONY TRAVIS ENVIRONEMENT $DB ACTIVE ";

if [ "$DB" = "mysql" ]
	echo "NODEFONY TRAVIS ENVIRONEMENT MYSQL ACTIVE " ;
	cp .travis/config/config.yml app/config/config.yml ;
then
	echo "NODEFONY TRAVIS ENVIRONEMENT SQLITE ACTIVE " ;
fi

#configuring the system
make

./nodefony_dev &

