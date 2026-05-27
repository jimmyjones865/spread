per Docker documentation: If you need a literal dollar sign, you should escape it with a double dollar sign $$ or wrap the value in single quotes 'pa$$word'.
I did that and it worked. escaping $ with $$ doesnt _really_ work because its extremely user-unfriendly. also any check for length will probably fail because I assume you cant know how many $ get added that way.
I renamed the app.env back to .env and removed app.env from .gitignore.
I can log in now and and see the collection. few notes:
the side bar has the same length as the content area. meaning the theme switch and logout button are too far down. the content should scroll independently
for the Books page, add a switch for list view <> grid with only covers with title and author
in Book Edit, the save changes button is not at the bottom. 
in Book Edit, the save changes button has weird behaviour: I believe it saves, but on click it just blinks. no "saved" or something
in Book Edit, clicking in Tags should open a dropdown with existing tags
in Book Edit, manual upload of images as well as deleting and re-ordering seems to work OK

In Artist Edit, there is no Country list behind the country field - i believe that should have been there, or maybe later
In Artists list, would be nice if there were a counter for books next to the name, similar to tags list

In Books list and Artists list, add a search bar (Books: Artist and Title, Artists: Name)

The "Footer" in side bar cant be clicked (if it should already)

the Tags list is a lot more compact (less columns) than the books or artists list and I like it better; take Tags list as example for the others

in add/edit Page, can there be a markup thingy in the Body field? These clickable things, I believe there are tiny libraries that can do that

adding Artist works OK
adding Tag works OK (both from Tags and from Book Edit)
adding Page seems to work OK (cant see the page yet anywhere of course)


light/dark switch doesnt work (if it should already)
logout doesnt work (if it should already) - deleting the cookie does work



scraping:
 all images are shown twice in my example (URL https://www.buchkunst-berlin.de/produkt/michael-wolf-cheung-chau-sunrises/). I downloaded both as spreads, and one of them is ~2x the size as the other (all images in images/65). I suspect that both preview and actual image are scraped
 all books in admin have a numbered URL that is mirrored in the images folder. shouldnt this have been generated form author-title?
 I cant chose the first image as cover, only as spread. works for all other images.
 chosing any block as description or colophon has no feedback - clicking does nothing, and the texts arent used for description or colophon
 I couldnt test yet because that doesnt work yet, but I expect there will be a multiple text blocks that are relevant for description, e.g.. So clicking multiple -> description should add all of them to description, ideally actually as blocks (maybe with line breaks in between to not start adding markdown? I understand that was a no-no)

 
