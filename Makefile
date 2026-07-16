.PHONY: build serve font

build:
	./scripts/build.sh

serve:
	./scripts/serve.sh

font:
	./scripts/subset-font.sh
