# script will execute input argument if node_modules exists
if [ ! -d "./node_modules" ]; then
	echo "ERROR, PROJECT NOT INITIALIZED - first, execute this script: npm run init"
	exit
else
	# execute input scripts
	for var in "$@"
	do
   	$var
	done
fi