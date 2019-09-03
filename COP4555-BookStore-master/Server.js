const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const app = express()
const path = require('path')
const cors = require('cors')
var mongodb = require('mongodb').MongoClient;
const SimpleCrypto = require('simple-crypto-js').default

const url = "mongodb://localhost:27017/";

var simpleCrypto = new SimpleCrypto('myEncryption');

app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use(express.static("public") );
app.use(cors());
app.use(cookieParser('keyboard_cat_blah'))
app.use(session({
	secret: 'keyboard_cat_blah',
	saveUninitialized: true,
	resave: false
}))

const port = 8000
var db
mongodb.connect(url, { useNewUrlParser: true }, function(err, client) {
    if (err) throw err;
	db = client.db('geektext');
});

/*
These app.get() calls tell the application which html file
to display in the browser for which path. 
*/
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'))
})
app.get('/search', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'search.html'))
})
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'))
})
app.get('/bookdetails', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bookdetails.html'))
})
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'))
})
app.get('/review', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'writeReview.html'))
})

/*
Creates a collection called 'users' and saves req.body in it only if the username
doesn't exist already. If it already exists, it will print that the account exists
in the console.
*/
app.post('/users', (req, res) => {
	db.collection('users').find({username:req.body.username}).toArray((err, results) => {
		if (err) throw err
		var resLength = results.length
		user = req.body
		user.password = simpleCrypto.encrypt(user.password);
		// Encryption using the first instance (simpleCrypto1)
		console.log(user.password)


		if(resLength == 0){
			db.collection('users').insertOne(req.body, (err, result) => {
				if (err) throw err
				console.log('Successfully saved')
				res.redirect('/login')
			})
			/*
			Once the account is saved, this will immediately find the account and
			add several fields that are needed but aren't provided in the sign up 
			form the user filled out. They are two empty arrays (one for the wishlist,
			and one for their current shopping cart), and a boolean to mark if a user
			is logged in or not. 
			*/
			db.collection('users').updateOne(
				{ username:req.body.username }, 
				{ $set: { "wishlistnames" : [], "wishlist1" : [], "wishlist2" : [], "wishlist3" : [], "cart" : [], "savedForLater": [], "loggedIn" : false} }
			)
		} else {
			console.log('You already have an account with us!')
		}

	})
})

app.get('/users', (req, res) => {
	var cursor = db.collection('users').find().toArray((err, results) => {
		if (err) throw err
	})
	console.log(req.body)
})

/*
This post enables the users to login if their username and password matches some user in the database.
If it doesn't, it will print 'incorrect username or password' in the console.
*/
app.post('/userLogin', (req, res) => {
	db.collection('users').find({username:req.body.username}).toArray((err, results) => {
		if (err) throw err
		decrypted_password = simpleCrypto.decrypt(results[0].password)
		if(decrypted_password !== req.body.password){
			console.log('Incorrect username or password')
		} else {
			req.session.username = req.body.username;
			res.render('loggedinhome.ejs', {username:req.body.username})
		}
	})
})

app.post('/cart', (req, res) => {
	db.collection('books').find().toArray((err, results) => {
		if (err) throw err
		db.collection('users').find({username:req.body.username}).toArray((err2, results2) => {
			if(err2) throw err2
			var userCart = results2[0].cart
			var savedCart = results2[0].savedForLater
			res.render('cart.ejs', {books:results, username:req.body.username, cart:userCart, saved:savedCart})
		})
	})
})

function searchCart(bookTitle, cart){
	for(var i = 0; i < cart.length; i++){
		title = cart[i].title
		if(bookTitle == title) return [true, i]
	}
	return [false, -1]
}

app.post('/addToCart', (req, res) => {
	db.collection('books').find().toArray((err, results) => {
		if (err) throw err
		db.collection('users').find({username:req.body.username}).toArray((err2, results2) => {
			if (err2) throw err2
			user = results2[0]
			userCart = user.cart
			savedCart = user.savedForLater
	
			var found = searchCart(req.body.title, userCart)[0]
			if(!found){
				db.collection('users').findOneAndUpdate(
					{ username:req.body.username },
					{ $push: { 'cart': {title: req.body.title, price: parseFloat(req.body.price), counter: 1} } } 
				)
			}
			res.render('cart.ejs', {books:results, username:req.body.username, cart:userCart, saved:savedCart})
		})
	})
})

app.post('/removeFromCart', (req, res) => {
	db.collection('books').find().toArray((err, results) => {
		if (err) throw err
		db.collection('users').find({username:req.body.username}).toArray((err2, results2) => {
			if (err2) throw err2
			user = results2[0]
			userCart = user.cart
			savedCart = user.savedForLater
			bookInd = searchCart(req.body.title, userCart)[1]
			if (bookInd >= 0){
				db.collection('users').updateOne(
					{ $and: [ { username: req.body.username }, { 'cart.title': req.body.title } ] },
					{ $pull: { cart: {title: req.body.title} } }
				)
			}
			
			res.render('cart.ejs', {books:results, username:req.body.username, cart:userCart, saved:savedCart})
		})
	})
})

app.post('/editCart', (req, res) => {
	db.collection('books').find().toArray((err, results) => {
		if(err) throw err
		db.collection('users').find({username: req.body.username}).toArray((err2, results2) => {
			if(err2) throw err2
			user = results2[0]
			userCart = user.cart
			savedCart = user.savedForLater
			bookInd = searchCart(req.body.title, userCart)[1]
			if(bookInd >= 0){
				if(isNaN(parseInt(req.body.count))){
					db.collection('users').updateOne(
						{ $and: [ { username: req.body.username }, { 'cart.title': req.body.title } ] },
						{ $set: { 'cart.$[book].counter': 1 } },
						{ arrayFilters: [ { 'book.title': req.body.title } ] }
					)
				} else {
					db.collection('users').updateOne(
						{ $and: [ { username: req.body.username }, { 'cart.title': req.body.title } ] },
						{ $set: { 'cart.$[book].counter': parseInt(req.body.count) } },
						{ arrayFilters: [ { 'book.title': req.body.title } ] }
					)
				}
			} else {
				console.log("That book is not in your cart! Click 'Add to cart' to edit quantity.")
			}
			res.render('cart.ejs', {books:results, username:req.body.username, cart:userCart, saved:savedCart})
		})
	})
})

app.post('/saveToCart', (req, res) => {
	db.collection('books').find().toArray((err, results) => {
		if(err) throw err
		db.collection('users').find({username: req.body.username}).toArray((err2, results2) => {
			if(err2) throw err2
			user = results2[0]
			userCart = user.cart
			savedCart = user.savedForLater
			found = searchCart(req.body.title, savedCart)[0]
			if(!found){
				db.collection('users').findOneAndUpdate(
					{ username:req.body.username },
					{ $push: { 'savedForLater': {title: req.body.title, price: parseFloat(req.body.price)} } } 
				)
				db.collection('users').updateOne(
					{ $and: [ { username: req.body.username }, { 'cart.title': req.body.title } ] },
					{ $pull: { cart: {title: req.body.title} } }
				)
			} else {
				console.log("That book has already been saved for later!")
			}
			res.render('cart.ejs', {books:results, username:req.body.username, cart:userCart, saved:savedCart})
		})
	})
})

app.post('/unsaveToCart', (req, res) => {
	db.collection('books').find().toArray((err, results) => {
		if(err) throw err
		db.collection('users').find({username: req.body.username}).toArray((err2, results2) => {
			if(err2) throw err2
			user = results2[0]
			userCart = user.cart
			savedCart = user.savedForLater
			found = searchCart(req.body.title, savedCart)[0]
			if(found){
				db.collection('users').updateOne(
					{ $and: [ { username: req.body.username }, { 'savedForLater.title': req.body.title } ] },
					{ $pull: { savedForLater: {title: req.body.title} } }
				)
				db.collection('users').findOneAndUpdate(
					{ username:req.body.username },
					{ $push: { 'cart': {title: req.body.title, price: parseFloat(req.body.price), counter: 1} } } 
				)
			} else {
				console.log("That book has already been unsaved!")
			}
			res.render('cart.ejs', {books:results, username:req.body.username, cart:userCart, saved:savedCart})
		})
	})
})

app.post('/addToWishlistFromCart', (req, res) => {
	db.collection('books').find().toArray((err, results) => {
		if (err) throw err
		db.collection('users').find({username:req.body.username}).toArray((err2, results2) => {
			if (err2) throw err2
			db.collection('users').findOneAndUpdate(
				{ username:req.body.username },
				{ $push: { 'wishlist1': {title: req.body.title, price: parseFloat(req.body.price)} } } 
			)

			user = results2[0]
			userCart = user.cart
			savedCart = user.savedForLater
			found = searchCart(req.body.title, userCart)[0]
			if (found){
				db.collection('users').updateOne(
					{ $and: [ { username: req.body.username }, { 'cart.title': req.body.title } ] },
					{ $pull: { cart: {title: req.body.title} } }
				)
			}
			
			res.render('cart.ejs', {books:results, username:req.body.username, cart:userCart, saved:savedCart})
		})
	})
})

app.post('/goToBookDetails', (req, res) => {
	db.collection('books').find({ id: req.body.id }).toArray((err, results) => {
		if (err) throw err
		db.collection('users').find({username:req.body.username}).toArray((err2, results2) => {
			if (err2) throw err2
			theBook = results[0]
			res.render('bookdetails.ejs', {book: theBook, username: req.body.username})
		})
	})
})

// app.post('/addToWishlist', (req, res) => {
// 	/*
// 	Code to add book to wishlist goes here
// 	*/
	
// 	/*
// 	Code to remove book from cart once it's added to wishlist goes here
// 	*/c
// 	db.collection('books').find().toArray((err, results) => {
// 		if (err) throw err
// 		db.collection('users').find({username:req.body.username}).toArray((err2, results2) => {
// 			if (err2) throw err2
// 			user = results2[0]
// 			userCart = user.cart
// 			bookInd = searchCart(req.body.title, userCart)[1]
// 			if (bookInd >= 0){
// 				db.collection('users').updateOne(
// 					{ $and: [ { username: req.body.username }, { 'cart.title': req.body.title } ] },
// 					{ $pull: { cart: {title: req.body.title} } }
// 				)
// 			}
			
// 			res.render('cart.ejs', {books:results, username:req.body.username, cart:userCart})
// 		})
// 	})
// })

app.get('/login', (req, res) => {
	res.render('login.ejs', {})
})

app.post('/wishlist', (req, res) => {
	db.collection('users').find({username:req.body.username}).toArray((err, results) => {
		if(err) throw err
		var wish1 = results[0].wishlist1
		var wish2 = results[0].wishlist2
		var wish3 = results[0].wishlist3
		var name = results[0].wishlistnames
		res.render('wishlist.ejs', {books:results, username:req.body.username, wishlist1:wish1, wishlist2:wish2, wishlist3:wish3, wishlistnames:name})
	})
})
app.post('/addToWishlist', (req, res) => {
	db.collection('books').find().toArray((err, results) => {
		if (err) throw err
		db.collection('users').find({username:req.body.username}).toArray((err2, results2) => {
			if (err2) throw err2
			db.collection('users').findOneAndUpdate(
				{ username:req.body.username },
				{ $push: { 'wishlist1': {title: req.body.title, price: parseFloat(req.body.price)} } } 
			)
		})
	})
})
app.post('/moveToWishlist', (req, res) => {
	db.collection('books').find().toArray((err, results) => {
		if (err) throw err
		db.collection('users').find({username:req.body.username}).toArray((err2, results2) => {
			if (err2) throw err2
			if (req.body.moveto === '1') {
				db.collection('users').findOneAndUpdate(
					{ username:req.body.username },
					{ $push: { wishlist1: {title: req.body.title, price: parseFloat(req.body.price)} } } 
				)
			}
			if (req.body.moveto === '2') {
				db.collection('users').findOneAndUpdate(
					{ username:req.body.username },
					{ $push: { wishlist2: {title: req.body.title, price: parseFloat(req.body.price)} } } 
				)
			}
			if (req.body.moveto === '3') {
				db.collection('users').findOneAndUpdate(
					{ username:req.body.username },
					{ $push: { wishlist3: {title: req.body.title, price: parseFloat(req.body.price)} } } 
				)
			}
			if (req.body.listnumber === '1') {
				db.collection('users').updateOne(
					{ $and: [ { username: req.body.username }, { 'wishlist1.title': req.body.title } ] },
					{ $pull: { wishlist1: {title: req.body.title} } }
				)
			}
			if (req.body.listnumber === '2') {
				db.collection('users').updateOne(
					{ $and: [ { username: req.body.username }, { 'wishlist2.title': req.body.title } ] },
					{ $pull: { wishlist2: {title: req.body.title} } }
				)
			}
			if (req.body.listnumber === '3') {
				db.collection('users').updateOne(
					{ $and: [ { username: req.body.username }, { 'wishlist3.title': req.body.title } ] },
					{ $pull: { wishlist3: {title: req.body.title} } }
				)
			}
		})
	})
})
app.post('/removeFromWishlist', (req, res) => {
	db.collection('books').find().toArray((err, results) => {
		if (err) throw err
		db.collection('users').find({username:req.body.username}).toArray((err2, results2) => {
			if (err2) throw err2
			if (req.body.listnumber === '1') {
				db.collection('users').updateOne(
					{ $and: [ { username: req.body.username }, { 'wishlist1.title': req.body.title } ] },
					{ $pull: { wishlist1: {title: req.body.title} } }
				)
			}
			if (req.body.listnumber === '2') {
				db.collection('users').updateOne(
					{ $and: [ { username: req.body.username }, { 'wishlist2.title': req.body.title } ] },
					{ $pull: { wishlist2: {title: req.body.title} } }
				)
			}
			if (req.body.listnumber === '3') {
				db.collection('users').updateOne(
					{ $and: [ { username: req.body.username }, { 'wishlist3.title': req.body.title } ] },
					{ $pull: { wishlist3: {title: req.body.title} } }
				)
			}
		})
	})
})
app.post('/renameWishlist', (req, res) => {
	db.collection('users').find({username:req.body.username}).toArray((err, results) => {
		if (err) throw err
			db.collection('users').updateOne(
				{ $and: [ { username: req.body.username }, { 'wishlistnames.num': req.body.listnumber } ] },
				{ $pull: { wishlistnames: {num: req.body.listnumber} } } 
			)
			db.collection('users').findOneAndUpdate(
				{ username: req.body.username },
				{ $push: { wishlistnames: {num: req.body.listnumber, name: req.body.newname} } } 
			)
	})
})
app.post('/addToCartFromWishlist', (req, res) => {
	db.collection('books').find().toArray((err, results) => {
		if (err) throw err
		db.collection('users').find({username:req.body.username}).toArray((err2, results2) => {
			if (err2) throw err2
			user = results2[0]
			userCart = user.cart
			savedCart = user.savedForLater
	
			var found = searchCart(req.body.title, userCart)[0]
			if(!found){
				db.collection('users').findOneAndUpdate(
					{ username:req.body.username },
					{ $push: { 'cart': {title: req.body.title, price: parseFloat(req.body.price), counter: 1} } } 
				)
			}
			// res.render('cart.ejs', {books:results, username:req.body.username, cart:userCart, saved:savedCart})
			if (req.body.listnumber === '1') {
				db.collection('users').updateOne(
					{ $and: [ { username: req.body.username }, { 'wishlist1.title': req.body.title } ] },
					{ $pull: { wishlist1: {title: req.body.title} } }
				)
			}
			if (req.body.listnumber === '2') {
				db.collection('users').updateOne(
					{ $and: [ { username: req.body.username }, { 'wishlist2.title': req.body.title } ] },
					{ $pull: { wishlist2: {title: req.body.title} } }
				)
			}
			if (req.body.listnumber === '3') {
				db.collection('users').updateOne(
					{ $and: [ { username: req.body.username }, { 'wishlist3.title': req.body.title } ] },
					{ $pull: { wishlist3: {title: req.body.title} } }
				)
			}
		})
	})
})

/** This will add a review to the DB**/
app.post('/addReview', (req, res) => {
	console.log('/addReview')
	object = {
		idBook: req.query.idBook,
		title: req.query.title,
		review: req.query.review,
		rating: req.query.rating,
		username: req.query.username,
		updated: getDateAndTime(),
		writtenAs: req.query.writtenAs
	}
	
	db.collection('reviews').insertOne(object, (err, result) => {
		if (err) res.sendStatus(500);
		console.log(`Successfully saved review: ${object}`)
	})
	res.sendStatus(200)
})

/**This is will update a given ID on the DB**/
app.post('/updateReview', (req, res) => {
	console.log('/updateReview')
	object = {
		idBook: req.query.idBook,
		title: req.query.title,
		review: req.query.review,
		rating: req.query.rating,
		username: req.query.username,
		updated: getDateAndTime(),
		writtenAs: req.query.writtenAs
	}
	
	db.collection('reviews').updateOne({username:object.username, idBook: req.query.idBook}, {$set: object}, (err , collection) => {
			if (err) res.sendStatus(500);
			console.log("Review has been updated!" + collection);
	});
		
	res.sendStatus(200)
})


app.post('/deleteReview', (req, res) => {
	console.log('/deleteReview')
	toDelete = {username: req.query.username, idBook: req.query.idBook}
	db.collection("reviews").deleteOne(toDelete, function(err, obj) {
	  if (err) res.sendStatus(500);
	  console.log("Deleted!");
	});
	res.sendStatus(200)
})


app.get('/getReviewsForidBook', (req, res) => {
	console.log('/getReviewsForidBook')
	console.log(`Looking for book with ID: ${req.query.idBook}`)
	db.collection('reviews').find({idBook:req.query.idBook}).toArray((err, results) => {
		if (err) res.sendStatus(500)
		console.log(results)
		res.json(results)
	})
})

app.get('/getBookInfo', (req, res) => {
	db.collection('books').find({ id: req.query.idBook }).toArray((err, results) => {
		if (err) throw res.sendStatus(500);
		console.log(results)
		res.json(results[0])
	})
})

app.get('/purchased', (req, res) => {
	db.collection('users').find({ username: req.query.username }).toArray((err, results) => {
		if (err) throw res.sendStatus(500);
		console.log(req.query.idBook in results[0].purchased)
		res.json(req.query.idBook in results[0].purchased)
	})})

function getDateAndTime(){
	var today = new Date();
	var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
	var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
	var dateTime = date + ' ' + time;
	return dateTime
}

app.get('/book/:bookId', (req, res) => {
	db.collection('books').find({ id: req.params.bookId }).toArray((err, results) => {
		if (err) throw err;

		if (results.length === 0) {
			console.log('The book does not exist');
			res.redirect('/');
		} else {
			const book = results[0];
			res.render('bookdetails.ejs', { book: book, username: ""});
		}
	})
})


app.get('/author/:authorName', (req, res) => {
	//convert
	const authorName = req.params.authorName.split('_').join(' ');


	db.collection('books').find({ author: authorName }).toArray((err, results) => {
		if (err) throw err;

		if (results.length === 0) {
			console.log('The author does not exist');
			res.redirect('/');
		} else {
			const books = results;
			res.render('author.ejs', { authorName: authorName, books: books });
		}
	})
})

app.get('/settings', (req, res) => {
	const username = req.session.username;

	if (!username) {
		console.log('you are not logged in!');
		res.redirect('/')
	} else {
		db.collection('users').find({ username: username }).toArray((err, results) => {
			if (err) throw err
			
			if (results.length == 0) {
				console.log('that user does not exist');
				res.redirect('/')
			} else {
				const userData = results[0];
				userData.password = simpleCrypto.decrypt(userData.password)
				res.render('settings', { user: userData })
			}
		})
	}
})

app.post('/updateCredentials', (req, res) => {
	const username = req.session.username;
	var encrypted_password = simpleCrypto.encrypt(req.body.password)

	if (!username) {
		console.log('you cant update your credentails if youre not logged in!');
		res.redirect('/');
	} else {
		db.collection('users').updateOne({ username: username }, {
			$set: {
				username: req.body.username,
				password: encrypted_password,
				nickname: req.body.nickname,
				email: req.body.email,
				address: req.body.address,
				shipAddress: req.body.shipAddress,
				cardNum: req.body.cardNum,
				cardExp: req.body.cardExp,
				cvv: req.body.cvv,
				
			}
		})
	}	
})

// Tells the app to start listening for requests.
app.listen(port, () => console.log(`App listening on port ${port}!`))
