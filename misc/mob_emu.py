#!/usr/bin/env python

import serial
import re
import string
import time
import os
import subprocess
import sys
from time import sleep
import json

dev = '/dev/ttyUSB0'
speed = 115200

motors = {'queue':0, 'state':'s', 'vall':0, 'vleft': 0, 'vright':0}
stepp = [   {'token':'st', 'queue':0, 'state':'s', 'mode':'m', 'turns':0, 'angle':0},
            {'token':'st', 'queue':0, 'state':'s', 'mode':'m', 'turns':0, 'angle':0} ]
leds = ['d', 'd', 'd', 'd']
servo = 27

def parse_inbuf(buf):
	print buf
	pa_cmd = json.loads(buf)
	if 'mot' in pa_cmd:
		mt = pa_cmd['mot']
		print "mot: "+ mt[0] + " " + str(mt[1])
		nstate = mt[0]
		if (mt[0] == "f") or (mt[0] == "b"):
			motors['vall'] = motors['vleft'] = motors['vright'] = mt[1]
		elif mt[0] == "s":
			motors['vall'] = motors['vleft'] = motors['vriight'] = 0
		elif mt[0] == "r":
			motors['vright'] = 0
			#print "vright= " + str(motors['vright'])
		elif mt[0] == "l":
			motors['vleft'] = 0
			#print "vleft= " + str(motors['vleft'])
		elif mt[0] == "n":
			motors['vleft'] = motors['vright'] = motors['vall']
			if motors['vall'] > 0:
				nstate = "f"
			elif motors['vall'] < 0:
				nstate = "b"
			else:
				nstate = "s"
		motors['state'] = nstate
		st = '{"ms":["' + nstate + '",' + str(motors['vall']) + ',' + str(motors['vleft']) + \
			',' + str(motors['vright']) + ']}\n'
		print '>>> ' + st
		ser.write(st.encode('ascii', 'ignore'))
		time.sleep(0.01)
		st = '{"mq":' + str(motors['queue']) + '}\n'
		print '>>> ' + st
		ser.write(st.encode('ascii', 'ignore'))

	elif 'st' in pa_cmd:
		stp = pa_cmd['st']
		stnum = stp[2]
		stepp[stnum]['angle'] = stp[1]
		stepp[stnum]['state'] = stp[0]
		st = '{"ss":[' + str(stnum) + ',"s","m"]}\n'
		print '>>> ' + st
		ser.write(st.encode('ascii', 'ignore'))
		time.sleep(0.01)
		st = '{"sv":[' + str(stnum) + ',' + str(stepp[stnum]['turns']) + \
			',' + str(stepp[stnum]['angle']) + ']}\n'
		print '>>> ' + st
		ser.write(st.encode('ascii', 'ignore'))
		time.sleep(0.01)
		st = '{"sq":[' + str(stnum) + ',' + str(stepp[stnum]['queue']) + ']}\n'
		print '>>> ' + st
		ser.write(st.encode('ascii', 'ignore'))

	elif 'servo' in pa_cmd:
		servo = pa_cmd['servo']
		st = u'{"servo":' + str(servo) + '}\n'
		print '>>> ' + st
		ser.write(st.encode('ascii', 'ignore'))


ser = serial.Serial(dev, speed, timeout = 1)

inbuf = ''
while 1:
	while ser.inWaiting() > 0:
		ch = ser.read(1)
		if ch != '\n':
			inbuf += ch
		else:
			parse_inbuf(inbuf)
			inbuf = ''


