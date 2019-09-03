params = window.location.href.split("?")[1].split("&")
const username = params[0].split('=')[1]
const idBook = params[1].split('=')[1]
var titleBook
var purchased

requestHTTP('GET', `getBookInfo?idBook=${idBook}`, function(data) {
    if (data) {
    book = JSON.parse(data)
    titleBook = book.title
    }
})

console.log([username, idBook])
var reviews
var myReview


var averageRating = function(){
    if (!reviews) {
        return 0
    }
    totalRating = 0
    
    for (i in reviews){
        totalRating = totalRating + Number(reviews[i].rating)
    }
    return (totalRating / reviews.length).toFixed(2);
}

window.onload = function(){
    document.getElementById("writeAs").value = username
    console.log("Loaded")
    requestHTTP('GET', `getReviewsForidBook?idBook=${idBook}`, function(data){
        reviews = JSON.parse(data)
        console.log("Generating Reviews DOM")
        generateReviewsDOM()
        myReview = getMyReview()
       
        if (myReview) setupMyReview(myReview)
    
    })

    requestHTTP('GET', `purchased?username=${username}&idBook=${idBook}`, function(data) {
        purchased = JSON.parse(data)
        console.log("Purchased: " + purchased)

        if (!purchased){
            document.getElementById("message").value = "Please purchase the book before reviewing it!"
            document.getElementById("submit").style.visibility = 'hidden';
            document.getElementById("delete").style.visibility = 'hidden';    
        }
    })

}

function submit() {
    var review = {
        writtenAs: document.getElementById("writeAs").value,
        rating: document.getElementById("rating").value,
        title: document.getElementById("title").value,
        review: document.getElementById("message").value,
    }

    if (!myReview) {
        requestHTTP('POST', `addReview?idBook=${idBook}&title=${review.title}&review=${review.review}&rating=${review.rating}&username=${username}&writtenAs=${review.writtenAs}`, function(){
            location.reload();
        })
    } else {
        requestHTTP('POST', `updateReview?idBook=${idBook}&title=${review.title}&review=${review.review}&rating=${review.rating}&username=${username}&writtenAs=${review.writtenAs}`, function(){
            location.reload();
        })
    }
}

function reloadPage(){
    location.reload();
}

function requestHTTP(typeOfRequest, params, func) {
    var request = new XMLHttpRequest();
    var url = 'http://localhost/' + params
    request.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            func(this.responseText)
        }
    };

    request.open(typeOfRequest, url);
    request.send();
}


function generateReviewsDOM(){
    if (titleBook){
        var titleBookDOM = document.getElementById("titleBook")
        titleBookDOM.textContent = titleBook
    }
    totalRating = 0 
    for (i in reviews){
        createReviewDOM(reviews[i])
    }
}
function createReviewDOM(review){
    if (!review.writtenAs) {
        review.writtenAs = 'Anonymous'
    }
    var averageRatingDOM = document.getElementById("averageRating")
    averageRatingDOM.innerText = `Average Rating: ${averageRating()} of 5 Stars!`
    var allReviewsDiv = document.getElementById("reviews")
    var reviewDiv = document.createElement("div");
    reviewDiv.id = 'review'
    var title = document.createTextNode('Title: ' + review.title)
    var writtenAs = document.createTextNode('Written As: ' + review.writtenAs)
    var time = document.createTextNode('Time: ' + review.updated)
    var totalStars = document.createTextNode('Rating: ' + review.rating);
    var review = document.createTextNode(review.review)
    reviewDiv.appendChild(title);
    reviewDiv.appendChild(document.createElement("br"));
    reviewDiv.appendChild(writtenAs);
    reviewDiv.appendChild(document.createElement("br"));
    reviewDiv.appendChild(totalStars);
    reviewDiv.appendChild(document.createElement("br"));
    reviewDiv.appendChild(time);
    reviewDiv.appendChild(document.createElement("br"));
    reviewDiv.appendChild(review);

    allReviewsDiv.appendChild(reviewDiv);  
}

function getMyReview(){
    for (i in reviews){
        if (reviews[i].username === username){
            return reviews[i]
        }
    }
    return null
}

function setupMyReview(review){
    console.log("Setting up my review!")
    console.log(review)
    document.getElementById("rating").value = Number(review.rating)
    document.getElementById("title").value = review.title
    document.getElementById("message").value = review.review
}

function deleteReview(){
    console.log("Deleting review")
    requestHTTP('POST', `deleteReview?idBook=${idBook}&username=${username}`, function(){
        location.reload();
    })
}