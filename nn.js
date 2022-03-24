function pixilated(el)
{
	const ctx = el.getContext('2d');
	const pixel = 100;


	let isMouseDown = false;

	canv.width = 500;
	canv.height = 500;

	const canvSize = canv.width;
	
	const cellSize = canvSize / pixel;
	this.drawCell = function(x, y, w, h)
	{
		ctx.fillStyle = 'blue';
		ctx.strokeStyle = 'blue';
		ctx.lineJoin = 'miter';
		ctx.lineWidth = 1;
		ctx.rect(x, y, w, h);
		ctx.fill();
	}

	this.clear = function() 
	{
		ctx.clearRect(0, 0, canvSize, canvSize);
	}
	this.calculate = function(draw = false) 
	{										
		const cellOffset = canvSize / cellSize;
		
		const vector = [];
		let cellsArray = [];

		for (let x = 0; x < canvSize; x += cellOffset)
		{
			for (let y = 0; y < canvSize; y += cellOffset)
			{
				const data = ctx.getImageData(x, y, cellOffset, cellOffset);

				let nonEmptyPixelsCount = 0;
				for (i = 0; i < data.data.length; i += 10)
				{
					const isEmpty = data.data[i] === 0;

					if (!isEmpty)
					{
						nonEmptyPixelsCount += 1;
					}
				}

				if (nonEmptyPixelsCount > 1 && draw)
				{
					cellsArray.push([x, y, cellOffset, cellOffset]);
				}

				vector.push(nonEmptyPixelsCount > 1 ? 1 : 0);
			}
		}

		if (draw)
		{
			this.clear();
			

			for (cell in cellsArray)
			{
				this.drawCell(cellsArray[cell][0], cellsArray[cell][1], cellsArray[cell][2], cellsArray[cell][3]);
			}
		}

		return vector;
	}

	el.addEventListener('mousedown', function(e) {
		isMouseDown = true;
		ctx.beginPath();
	})

	el.addEventListener('mouseup', function(e) {
		isMouseDown = false;
	})

	el.addEventListener('mousemove', function(e) {
		if( isMouseDown )
		{
			ctx.fillStyle = 'red';
			ctx.strokeStyle = 'red';
			ctx.lineWidth = pixel;

			//ctx.lineTo(e.offsetX, e.offsetY);
			//ctx.stroke();

			ctx.beginPath();
			ctx.fillRect(parseInt(e.offsetX/pixel)*pixel, parseInt(e.offsetY/pixel)*pixel, pixel, pixel);
			//ctx.arc(e.offsetX, e.offsetY, pixel / 2, 0, Math.PI * 2);
			ctx.fill();

			ctx.beginPath();
			ctx.moveTo(e.offsetX, e.offsetY);
		}
	})
		
}
let vector = [];
let net = null;
let train_data = [];

const d = new pixilated(document.getElementById('canv'));

document.addEventListener('keypress', function(e) {
	if( e.key.toLowerCase() == 'c' )
	{
		d.clear();
	}

	if( e.key.toLowerCase() == 'v' )
	{
		vector = d.calculate(true);
		
		//train
		if( confirm('odin?') )
		{
			train_data.push({
				input: vector,
				output: {'B': 1}
			});
		} else
		{
			train_data.push({
				input: vector,
				output: {ne_odin: 1}
			});
		}
		d.clear();
	}

	if( e.key.toLowerCase() == 'b' )
	{
		net = new brain.NeuralNetwork();
		net.train(train_data, {log: true});

		const result = brain.likely(d.calculate(), net);
		alert(result);
	}
});