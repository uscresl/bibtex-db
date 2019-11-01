# bibtex-db
JavaScript front-end to a BibTex database

## First MVP (Author view)

Show all publications grouped by year, as in https://robotics.usc.edu/resl/people/67/.

## Parse custom tags

We have a bibtex entry that indicates the status of the paper:

```
@inproceedings{okubo2009urg,
  title={Characterization of the {H}okuyo {URG}-04{LX} laser rangefinder for mobile robot obstacle negotiation},
  author={Okubo, Yoichi and Ye, Cang and Borenstein, Johann},
  booktitle={Unmanned Systems Technology XI},
  year={2009},
  status={under-review}
}
```

Need to parse the `status` tag, which can take up the following values:

* `under-review` means the paper has not been published, do not show it on the website
* `published` is the default setting, just show it as usual
* `accepted` means the paper has been accepted, but not officially published, do not show it on the website

## Professor's view

Create a separate front-end where the publications are shown, no matter which status.

Grouped by year, and maybe author (check examples in citation.js and others).

## (Optional) paper type

Similar to `status` tag, add a `type` tag that indicates the type of paper:

* `conference` (default setting)
* `workshop` or `abstract`
* `journal`
* `preprint`
* `book` (will be used automatically if the current BibTex entry is of type `@book`)

Group papers for the author view by year and type, as in https://robotics.usc.edu/resl/people/67/ (it will look the same).

## Integrate into WordPress

Deploy on lab website.
