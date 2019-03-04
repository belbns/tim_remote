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
		nstate = mt[0]
		if (nstate == "f") or (nstate == "b"):
			motors['vall'] = motors['vleft'] = motors['vright'] = mt[1]
		elif nstate == "r":
			motors['vright'] = 0
		elif nstate == "l":
			motors['vleft'] = 0
		elif nstate == "n":
			motors['vleft'] = motors['vright'] = motors['vall']
			if motors['vall'] > 0:
				nstate = "f"
			elif motors['vall'] < 0:
				nstate = "b"
			else:
				nstate = "s"
		else:	# nstate == "s":
			motors['vall'] = motors['vleft'] = motors['vright'] = 0

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
		stnum = stp[0]
		stepp[stnum]['angle'] = stp[2]
		stepp[stnum]['state'] = stp[1]
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


