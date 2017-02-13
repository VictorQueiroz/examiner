tdd:
	./node_modules/.bin/mocha test/ \
	--bail \
	--recursive \
	--require babel-register \
	-w

test:
	./node_modules/.bin/mocha test/ \
	--recursive \
	--require babel-register

build:
	./node_modules/.bin/babel src/ -d lib/

.PHONY: test build
