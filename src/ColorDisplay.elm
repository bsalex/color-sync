module ColorDisplay exposing (..)

import Html exposing (Html, div)
import Html.Attributes exposing (class, style)

view : String -> Html msg
view color =
    div [ class "color-display", style [ ( "background-color", color ) ] ]
        []
