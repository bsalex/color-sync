module Routing exposing (..)

import String
import Navigation
import UrlParser exposing (..)


type Route
    = MainRoute
    | SessionRoute String


matchers : Parser (Route -> a) a
matchers =
    oneOf
        [ format SessionRoute (string) ]


hashParser : Navigation.Location -> Result String Route
hashParser location =
    location.href
        |> Debug.log "hash"
        |> String.split "/"
        |> List.reverse
        |> List.head
        |> Maybe.withDefault ""
        |> Debug.log "session from url"
        |> parse identity matchers


parser : Navigation.Parser (Result String Route)
parser =
    Navigation.makeParser hashParser


routeFromResult : Result String Route -> Route
routeFromResult result =
    case result of
        Ok route ->
            route

        Err string ->
            MainRoute
